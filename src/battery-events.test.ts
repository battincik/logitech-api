import assert from "node:assert/strict";
import test from "node:test";
import { detectBatteryEvents, initialStoredState } from "./battery-events";
import type { BatteryPayload } from "./types";

const payload = (
  percentage: number,
  charging = false,
  fullyCharged = false,
): BatteryPayload => ({
  deviceId: "dev1",
  percentage,
  charging,
  fullyCharged,
});

test("ilk okumada bildirim üretmez", () => {
  assert.deepEqual(detectBatteryEvents(undefined, payload(18)).events, []);
});

test("ilk okuma şarj durumundaysa bildirir", () => {
  assert.equal(detectBatteryEvents(undefined, payload(18, true)).events[0]?.type, "charging");
});

test("düşük pil eşiğini yalnız bir kez bildirir", () => {
  const first = detectBatteryEvents(initialStoredState(payload(21)), payload(20));
  assert.equal(first.events[0]?.type, "low");
  assert.equal(first.events[0]?.threshold, 20);

  const second = detectBatteryEvents(first.state, payload(19));
  assert.deepEqual(second.events, []);
});

test("büyük düşüşte en kritik geçilen eşiği tek bildirimle verir", () => {
  const result = detectBatteryEvents(initialStoredState(payload(25)), payload(9));
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0]?.threshold, 10);
  assert.deepEqual(result.state.notifiedThresholds, [20, 10]);
});

test("şarja takılma ve tam dolum bildirilir", () => {
  const charging = detectBatteryEvents(
    initialStoredState(payload(10)),
    payload(10, true),
  );
  assert.equal(charging.events[0]?.type, "charging");

  const full = detectBatteryEvents(charging.state, payload(100, true, true));
  assert.equal(full.events[0]?.type, "full");
});

test("pilin bitişi ayrıca bildirilir", () => {
  const result = detectBatteryEvents(initialStoredState(payload(2)), payload(0));
  assert.equal(result.events[0]?.type, "empty");
});
