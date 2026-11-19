import type { BatteryDevice } from "./types";

const STALE_AFTER_MS = 3 * 60_000;

export interface TaskbarReading {
  name: string;
  percentage?: number;
  charging: boolean;
  tone: "neutral" | "low" | "charging" | "normal";
}

export function selectTaskbarReading(devices: BatteryDevice[], connected: boolean, now = Date.now()): TaskbarReading {
  const active = connected
    ? devices.filter((device) => device.connected && device.percentage !== undefined &&
        device.updatedAt !== undefined && now - device.updatedAt >= 0 && now - device.updatedAt < STALE_AFTER_MS)
      .sort((a, b) => (a.percentage ?? 101) - (b.percentage ?? 101))[0]
    : undefined;
  if (!active) return { name: "", charging: false, tone: "neutral" };
  return {
    name: active.name,
    percentage: active.percentage,
    charging: active.charging,
    tone: active.charging ? "charging" : (active.percentage ?? 100) <= 20 ? "low" : "normal",
  };
}
