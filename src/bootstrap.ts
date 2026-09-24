import { app, dialog } from "electron";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { CommitUpdater } from "./updater";
import type { UpdateConfig, UpdateStatus } from "./updater";

interface Application { startApp(controller: {
  check: () => Promise<boolean>;
  restart: () => void;
  status: () => UpdateStatus;
  onStatus: (callback: () => void) => void;
}): void }

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  const bundled = path.join(__dirname, "..", "updates", "app.cjs");
  const config = JSON.parse(readFileSync(path.join(__dirname, "..", "updater-config.json"), "utf8")) as UpdateConfig;
  let statusChanged = () => {};
  const updater = new CommitUpdater(app.getPath("userData"), bundled, config, () => statusChanged());
  const controller = {
    check: () => updater.check(),
    restart: () => { app.relaunch(); app.quit(); },
    status: () => updater.status,
    onStatus: (callback: () => void) => { statusChanged = callback; },
  };
  try {
    const candidate = existsSync(updater.target) ? updater.target : bundled;
    try {
      (require(candidate) as Application).startApp(controller);
    } catch (error) {
      if (candidate === bundled) throw error;
      console.error("Güncelleme yüklenemedi, paketlenmiş sürüme dönülüyor:", error);
      void updater.discard();
      (require(bundled) as Application).startApp(controller);
    }
    updater.start();
    app.on("before-quit", () => updater.stop());
  } catch (error) {
    console.error("Uygulama başlatılamadı:", error);
    void app.whenReady().then(() => {
      dialog.showErrorBox("Logitech Battery API", `Uygulama başlatılamadı: ${String(error)}`);
      app.quit();
    });
  }
}
