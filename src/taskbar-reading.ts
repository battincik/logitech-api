import type { BatteryDevice } from "./types";

const STALE_AFTER_MS = 3 * 60_000;

export interface TaskbarReading {
  name: string;
  percentage?: number;
  charging: boolean;
  tone: "neutral" | "low" | "charging" | "normal";
  kind: "headset" | "battery";
}

function isHeadset(device: BatteryDevice): boolean {
  return /headset|headphone|kulaklık|g\s*(?:733|535|435|935|933|635|432|332)|g\s*pro\s*x(?!\s*(?:superlight|mouse))/i
    .test(`${device.name} ${device.model}`);
}

export function selectTaskbarReading(devices: BatteryDevice[], connected: boolean, now = Date.now(), preferredId = "auto"): TaskbarReading {
  const eligible = connected
    ? devices.filter((device) => device.connected && device.percentage !== undefined &&
        device.updatedAt !== undefined && now - device.updatedAt >= 0 && now - device.updatedAt < STALE_AFTER_MS)
      .sort((a, b) => (a.percentage ?? 101) - (b.percentage ?? 101))
    : [];
  const active = preferredId === "auto" ? eligible.find(isHeadset) ?? eligible[0] : eligible.find((device) => device.id === preferredId);
  if (!active) return { name: "", charging: false, tone: "neutral", kind: "battery" };
  return {
    name: active.name,
    percentage: active.percentage,
    charging: active.charging,
    tone: active.charging ? "charging" : (active.percentage ?? 100) <= 20 ? "low" : "normal",
    kind: isHeadset(active) ? "headset" : "battery",
  };
}
