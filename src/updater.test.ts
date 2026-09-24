import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { CommitUpdater, gitBlobSha } from "./updater";

const config = { owner: "battincik", repo: "logitech-api", branch: "main" };
const commit = "a".repeat(40);

function mockFetch(bytes: Buffer, sha = gitBlobSha(bytes)): typeof fetch {
  return (async (url: string | URL | Request) => {
    if (String(url).includes("/commits?")) return Response.json([{
      sha: commit,
      commit: { message: "feat: test update", author: { date: "2026-09-24T00:00:00Z" } },
    }]);
    assert.match(String(url), new RegExp(`ref=${commit}$`));
    return Response.json({ type: "file", encoding: "base64", sha, content: bytes.toString("base64") });
  }) as typeof fetch;
}

test("commit paketi doğrulanır, indirilir ve tekrar indirilmeksizin kullanılır", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ghub-updater-"));
  try {
    const bundled = path.join(dir, "base.cjs");
    await writeFile(bundled, "old");
    const bytes = Buffer.from("new code");
    const updater = new CommitUpdater(dir, bundled, config, () => {}, mockFetch(bytes));
    assert.equal(await updater.check(), true);
    assert.deepEqual(await readFile(updater.target), bytes);
    assert.equal(await updater.check(), true);
    assert.equal(updater.status.phase, "ready");
    assert.equal(updater.status.commit, commit.slice(0, 7));
    assert.equal(updater.status.message, "feat: test update");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("bozuk içerik mevcut güncellemeyi değiştirmez", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ghub-updater-"));
  try {
    const bundled = path.join(dir, "base.cjs");
    await writeFile(bundled, "old");
    const valid = new CommitUpdater(dir, bundled, config, () => {}, mockFetch(Buffer.from("good")));
    await valid.check();
    const invalid = new CommitUpdater(dir, bundled, config, () => {}, mockFetch(Buffer.from("bad"), "a".repeat(40)));
    assert.equal(await invalid.check(), false);
    assert.equal(invalid.status.phase, "error");
    assert.equal((await readFile(invalid.target)).toString(), "good");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
