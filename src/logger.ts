import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export class AppLogger {
  readonly filePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(userDataPath: string) {
    this.filePath = path.join(userDataPath, "logs", "app.log");
  }

  info(message: string): void {
    this.write("INFO", message);
  }

  error(message: string, error?: unknown): void {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : error ? String(error) : "";
    this.write("ERROR", detail ? `${message} | ${detail}` : message);
  }

  async tail(maxCharacters = 12_000): Promise<string> {
    try {
      const content = await readFile(this.filePath, "utf8");
      return content.slice(-maxCharacters);
    } catch {
      return "";
    }
  }

  private write(level: string, message: string): void {
    const clean = message.replace(/[\r\n]+/g, " ").slice(0, 4_000);
    const line = `[${new Date().toISOString()}] ${level} ${clean}\n`;
    this.writeQueue = this.writeQueue.catch(() => {}).then(async () => {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await appendFile(this.filePath, line, "utf8");
    });
  }
}
