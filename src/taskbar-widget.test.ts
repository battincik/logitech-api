import assert from "node:assert/strict";
import test from "node:test";
import { selectTaskbarReading } from "./taskbar-reading";
import type { BatteryDevice } from "./types";

const now = 1_800_000;
function device(percentage: number, overrides: Partial<BatteryDevice> = {}): BatteryDevice {
  return {
    id: "headset", stableKey: "headset", name: "G Pro X", model: "headset",
    connected: true, percentage, charging: false, fullyCharged: false, updatedAt: now,
    ...overrides,
  };
}

test("taskbar shows the lowest available battery and charging state", () => {
  assert.deepEqual(selectTaskbarReading([device(90), device(18, { name: "G733", charging: true })], true, now), {
    name: "G733", percentage: 18, charging: true, tone: "charging",
  });
});

test("taskbar never presents disconnected or stale readings as live", () => {
  assert.equal(selectTaskbarReading([device(100)], false, now).percentage, undefined);
  assert.equal(selectTaskbarReading([device(100, { connected: false })], true, now).percentage, undefined);
  assert.equal(selectTaskbarReading([device(100, { updatedAt: now - 181_000 })], true, now).percentage, undefined);
  assert.equal(selectTaskbarReading([device(15, { updatedAt: now - 181_000 }), device(60)], true, now).percentage, 60);
});
