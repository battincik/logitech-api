import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { AppStore } from "./app-store";
import type { BatteryDevice } from "./types";

test("ayarları ve cihaz pil geçmişini kalıcı olarak saklar", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "logitech-battery-store-"));
  try {
    const store = new AppStore(directory);
    await store.load();
    await store.updateSettings({ language: "en", launchAtStartup: true });
    const device: BatteryDevice = {
      id: "mouse",
      stableKey: "mouse",
      name: "G502",
      model: "g502",
      connected: true,
      percentage: 62,
      charging: false,
      fullyCharged: false,
    };
    await store.recordBattery(device);

    const restored = new AppStore(directory);
    await restored.load();
    assert.equal(restored.settings.language, "en");
    assert.equal(restored.settings.launchAtStartup, true);
    assert.equal(restored.history.mouse.name, "G502");
    assert.equal(restored.history.mouse.points[0].percentage, 62);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
