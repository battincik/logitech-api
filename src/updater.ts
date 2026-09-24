import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BUNDLE_BYTES = 1_000_000;
const SHA_RE = /^[a-f0-9]{40}$/i;

export interface UpdateConfig { owner: string; repo: string; branch: string }
export interface UpdateStatus {
  phase: "idle" | "checking" | "ready" | "error";
  detail?: string;
  commit?: string;
  message?: string;
  checkedAt?: number;
  publishedAt?: string;
}

export function gitBlobSha(content: Buffer): string {
  return createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");
}

export class CommitUpdater {
  private timer?: NodeJS.Timeout;
  private checking?: Promise<boolean>;
  readonly target: string;
  status: UpdateStatus = { phase: "idle" };

  constructor(
    private readonly dataDir: string,
    private readonly bundledPath: string,
    private readonly config: UpdateConfig,
    private readonly onStatus: (status: UpdateStatus) => void,
    private readonly request: typeof fetch = fetch,
  ) {
    this.target = path.join(dataDir, "updates", "app.cjs");
    if (![config.owner, config.repo, config.branch].every((value) => /^[\w.-]+$/.test(value)) ||
      config.owner === "." || config.repo === "." || config.branch === ".") {
      throw new Error("Invalid GitHub update configuration");
    }
  }

  private setStatus(status: UpdateStatus): void {
    this.status = status;
    this.onStatus(status);
  }

  start(): void {
    // Let the tray and G HUB connection initialize first.
    this.timer = setTimeout(() => {
      void this.check();
      this.timer = setInterval(() => void this.check(), 6 * 60 * 60 * 1000);
    }, 15_000);
  }

  stop(): void { clearTimeout(this.timer); clearInterval(this.timer); }

  check(): Promise<boolean> {
    if (this.checking) return this.checking;
    this.checking = this.doCheck().finally(() => { this.checking = undefined; });
    return this.checking;
  }

  private async doCheck(): Promise<boolean> {
    this.setStatus({ phase: "checking" });
    try {
      const base = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}`;
      const headers = { Accept: "application/vnd.github+json", "User-Agent": "logitech-battery-api" };
      const commits = await this.request(`${base}/commits?path=updates%2Fapp.cjs&sha=${encodeURIComponent(this.config.branch)}&per_page=1`, { headers, signal: AbortSignal.timeout(15_000) });
      if (!commits.ok) throw new Error(`GitHub commits: HTTP ${commits.status}`);
      const entries: unknown = await commits.json();
      const commitEntry = Array.isArray(entries) ? entries[0] : undefined;
      const commit = isCommit(commitEntry) ? commitEntry.sha : undefined;
      if (typeof commit !== "string" || !SHA_RE.test(commit)) throw new Error("Update commit not found");
      const updateMeta = {
        commit: commit.slice(0, 7),
        message: isCommit(commitEntry) ? commitEntry.commit.message.split("\n")[0] : undefined,
        publishedAt: isCommit(commitEntry) ? commitEntry.commit.author?.date : undefined,
        checkedAt: Date.now(),
      };

      const response = await this.request(`${base}/contents/updates/app.cjs?ref=${commit}`, { headers, signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`GitHub content: HTTP ${response.status}`);
      const entry: unknown = await response.json();
      if (!isContent(entry)) throw new Error("Invalid GitHub bundle response");
      const bytes = Buffer.from(entry.content.replace(/\s/g, ""), "base64");
      if (!bytes.length || bytes.length > MAX_BUNDLE_BYTES || gitBlobSha(bytes) !== entry.sha) {
        throw new Error("Update bundle validation failed");
      }
      const shipped = await readFile(this.bundledPath);
      if (gitBlobSha(shipped) === entry.sha) {
        await this.discard();
        this.setStatus({ phase: "idle", detail: "Up to date", ...updateMeta });
        return false;
      }
      try {
        const current = await readFile(this.target);
        if (gitBlobSha(current) === entry.sha) {
          this.setStatus({ phase: "ready", detail: commit.slice(0, 7), ...updateMeta });
          return true;
        }
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
      await mkdir(path.dirname(this.target), { recursive: true });
      const temporary = `${this.target}.${process.pid}.tmp`;
      try {
        await writeFile(temporary, bytes, { flag: "wx" });
        // Renaming over an existing file may fail on Windows.
        await unlink(this.target).catch((error: unknown) => { if (!isNotFound(error)) throw error; });
        await rename(temporary, this.target);
      } finally {
        await unlink(temporary).catch(() => {});
      }
      this.setStatus({ phase: "ready", detail: commit.slice(0, 7), ...updateMeta });
      return true;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.setStatus({ phase: "error", detail, checkedAt: Date.now() });
      return false;
    }
  }

  async discard(): Promise<void> {
    await unlink(this.target).catch((error: unknown) => { if (!isNotFound(error)) throw error; });
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
function isContent(value: unknown): value is { type: "file"; encoding: "base64"; sha: string; content: string } {
  return typeof value === "object" && value !== null &&
    "type" in value && value.type === "file" &&
    "encoding" in value && value.encoding === "base64" &&
    "sha" in value && typeof value.sha === "string" && SHA_RE.test(value.sha) &&
    "content" in value && typeof value.content === "string";
}

function isCommit(value: unknown): value is {
  sha: string;
  commit: { message: string; author?: { date?: string } };
} {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { sha?: unknown; commit?: unknown };
  if (typeof candidate.sha !== "string" || !SHA_RE.test(candidate.sha)) return false;
  if (typeof candidate.commit !== "object" || candidate.commit === null) return false;
  return typeof (candidate.commit as { message?: unknown }).message === "string";
}
