import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BatteryDevice } from "./types";

export type AppLanguage = "tr" | "en";

export interface AppSettings {
  launchAtStartup: boolean;
  language: AppLanguage;
  notifyDisconnect: boolean;
  historyEnabled: boolean;
}

export interface BatteryHistoryPoint {
  timestamp: number;
  percentage: number;
  charging: boolean;
}

export interface BatteryHistorySeries {
  name: string;
  points: BatteryHistoryPoint[];
}

interface AppData {
  settings: AppSettings;
  history: Record<string, BatteryHistorySeries>;
}

const DEFAULT_SETTINGS: AppSettings = {
  launchAtStartup: false,
  language: "tr",
  notifyDisconnect: true,
  historyEnabled: true,
};
const HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const HISTORY_SAMPLE_MS = 5 * 60 * 1000;
const MAX_POINTS_PER_DEVICE = 2_500;

export class AppStore {
  private readonly filePath: string;
  private data: AppData = { settings: { ...DEFAULT_SETTINGS }, history: {} };
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(userDataPath: string) {
    this.filePath = path.join(userDataPath, "app-data.json");
  }

  async load(): Promise<void> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, "utf8")) as Partial<AppData>;
      const language = parsed.settings?.language === "en" ? "en" : "tr";
      this.data = {
        settings: { ...DEFAULT_SETTINGS, ...parsed.settings, language },
        history: parsed.history && typeof parsed.history === "object" ? parsed.history : {},
      };
      this.pruneHistory();
    } catch {
      this.data = { settings: { ...DEFAULT_SETTINGS }, history: {} };
    }
  }

  get settings(): AppSettings {
    return { ...this.data.settings };
  }

  get history(): Record<string, BatteryHistorySeries> {
    return structuredClone(this.data.history);
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const next = { ...this.data.settings, ...patch };
    next.language = next.language === "en" ? "en" : "tr";
    this.data.settings = next;
    await this.persist();
    return this.settings;
  }

  async recordBattery(device: BatteryDevice): Promise<void> {
    if (!this.data.settings.historyEnabled || device.percentage === undefined) return;
    const series = this.data.history[device.stableKey] ?? { name: device.name, points: [] };
    series.name = device.name;
    const last = series.points.at(-1);
    const now = Date.now();
    const changed = !last || last.percentage !== device.percentage || last.charging !== device.charging;
    if (!changed && now - last.timestamp < HISTORY_SAMPLE_MS) return;
    series.points.push({ timestamp: now, percentage: device.percentage, charging: device.charging });
    this.data.history[device.stableKey] = series;
    this.pruneHistory();
    await this.persist();
  }

  async clearHistory(): Promise<void> {
    this.data.history = {};
    await this.persist();
  }

  private pruneHistory(): void {
    const cutoff = Date.now() - HISTORY_RETENTION_MS;
    for (const [key, series] of Object.entries(this.data.history)) {
      series.points = series.points
        .filter((point) => Number.isFinite(point.timestamp) && point.timestamp >= cutoff)
        .slice(-MAX_POINTS_PER_DEVICE);
      if (series.points.length === 0) delete this.data.history[key];
    }
  }

  private async persist(): Promise<void> {
    const serialized = JSON.stringify(this.data, null, 2);
    this.writeQueue = this.writeQueue.catch(() => {}).then(async () => {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, serialized, "utf8");
    });
    await this.writeQueue;
  }
}
