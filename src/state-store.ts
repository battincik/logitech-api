import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StoredBatteryState } from "./types";

export class StateStore {
  private readonly filePath: string;
  private states: Record<string, StoredBatteryState> = {};
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(userDataPath: string) {
    this.filePath = path.join(userDataPath, "battery-state.json");
  }

  async load(): Promise<void> {
    try {
      this.states = JSON.parse(await readFile(this.filePath, "utf8"));
    } catch {
      this.states = {};
    }
  }

  get(key: string): StoredBatteryState | undefined {
    return this.states[key];
  }

  async set(key: string, state: StoredBatteryState): Promise<void> {
    this.states[key] = state;
    const serialized = JSON.stringify(this.states, null, 2);
    this.writeQueue = this.writeQueue.catch(() => {}).then(async () => {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, serialized, "utf8");
    });
    await this.writeQueue;
  }
}
