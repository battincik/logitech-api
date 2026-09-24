import {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  shell,
  Tray,
} from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppStore, type AppSettings } from "./app-store";
import { detectBatteryEvents } from "./battery-events";
import { createDashboardHtml, DASHBOARD_PRELOAD } from "./dashboard";
import { GHubClient } from "./ghub-client";
import { translator } from "./i18n";
import { AppLogger } from "./logger";
import { StateStore } from "./state-store";
import type { UpdateStatus } from "./updater";
import type {
  BatteryDevice,
  BatteryEvent,
  BatteryPayload,
  GHubDeviceInfo,
} from "./types";

const APP_ID = "com.battincik.logitechbatteryapi";
interface UpdateController {
  check: () => Promise<boolean>;
  restart: () => void;
  status: () => UpdateStatus;
  onStatus: (callback: () => void) => void;
}
let updater: UpdateController;

let tray: Tray;
let client: GHubClient;
let store: StateStore;
let appStore: AppStore;
let logger: AppLogger;
let dashboardWindow: BrowserWindow | undefined;
let connected = false;
let hasConnected = false;
let lastConnectedAt: number | undefined;
let lastDisconnectedAt: number | undefined;
let lastConnectionError: string | undefined;
const devices = new Map<string, BatteryDevice>();

app.setAppUserModelId(APP_ID);

const ICON_PNG = {
  green: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABvElEQVQ4y8XTz08TQRQH8O/s7jDQ1i7gLAk2NV5rPGA8uOUiHjgZ4M6Fv0EFTPgLVAT9F/on4I9TDxASbU1I9KJ4Fpsm7AS3urUdd7rPE6VFG5t48B1n8v3k5eU94H8XO/9ARHipqjMncbQammjuR6KnUpYIJpzMXtZJPV3yZg8YO4s558J2qV5+WNNq9XXjA2pthZ9kICx+KS+8Zd8tLIemuUlEG4wx09cBEaFUL29/an6+u6Mq0En8W7vC4rgjb+Ja+srmyvT8OmMM1unnC1WdqWk1MAwAOonxSr1FTau1naByA8AZEMbR2pvGx4HhXqTaOMQ307zXB5yY77eP2sFQkz/SAb6a6BYR2V2g1dFTMZmhgHYSI+q0cgCcLjBmi+MRiw8FCMaRssUxANMFJvmF/cvCGwrIj3q4yLO7jLFOF8ja6Se+W8DfuhAWR9EtYNzJPOob4pJXPMgJubUofYgBiLA4FmUROSGfLUj/HdCziYwxENGDUr3ccZ30eqVxiC86gE5ijDCO/KhE0b2KnJCPV6bnN07X+Y+38FxVr4dxdD800Vwr0d6YJYJxJ7M7wTNbC9J/33sL/1y/AMK/tR+ONtjoAAAAAElFTkSuQmCC",
  yellow: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABpElEQVQ4y8WTS04bQRCG/+p2u2fsBVgDLBhk8A2MxN7mDigmJ0BiR8JDygnCK8nKUm4Ayh1iYM0jEgewiWQWYDsoyPZ4xt3FgocNWMhSFqlllb6vS1VdwP8OeplgZnQuf2RtWFvlsJFn05wgmbymuHdAavSr4y8eE9FgATPLdrn42bR/r0a1nzCtC8CGgNSQiQyUl4N009tuZvkTEXWfCZgZ7XLxS/fv+Uqnuge2wet2hQM9uYDYyOy2m1leJ6KeIKjuZ6Ob07Og8n0g3C9xZpagRrJzztT7E/FYsGFjLaqV3oQBgG2AqH4IG918AIA+QW3etCpDTd60yuCwnmNmKXrZ5gRsONzuTADbvfUBxHoCmbyC1MMJpAOSySsA3SeBiI8dyURmOD4xA6HHS0RkegI1uqO8HEi83QUJB8rLQ6jU5rMhan/xWLrpXe0XQMIZDEsH2i9Auulv2i+cAUDsqUgEZt5ol4uGVGo9qh/AtCqA7QBCQ7rTUGPzkG566+En3nMvX2FmdKr7szZqfOTwT55Nc/z+FlIlEfd29eS7X/238M9xB7tUoVGaoF90AAAAAElFTkSuQmCC",
  orange: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABoElEQVQ4y8WTwU4TURSGv3Nn2oGpiZ2ibJjYTV1q2uqOMeIbiPUJDC+gIiY+gYooD9DEN2h8AwhOXKHFhSvYYIgLiTMu7GhLZ46Lmhak0SYuPMuT+3/3z3/Ogf9d8ntDVcl2XlW182WZTrxAL5kl7x5S8DZluvjC1BvbIjIeoKpWGjYfEx8sZ7tbaPQR0h7YDlIqYyoBeP6qFSw9EpH+CYCqkobN5/rpw92s3YKjH6f92g6mehPxL69awdKKiIwA6btWVQ/et9M3L8eLj0Gs+TvI3KWr1pXbb83QQRI9yHZf/1kM0O+S7YXo96/3AIYAOtENjfYnSl6jfejE11XVGgF6ySz93mSzO+pC99scYI8AefczOWcygO0M3kN/BCjMbEmpPJFeZspw5tyGiKRDgEyffWYqwYD+l99NJUDc4pMTIZp6YxvPXzO1RchNjRfnpjD1Bnj+uqndagPYQwciqOrDNGymluutZHvhIO1+D6w8UrqAuXgNPP/pr00c6E6NSJWs3appEt8niRfoJudxCoe4xQ1xS2umtrhz/Bb+uX4COnCVlohL8pQAAAAASUVORK5CYII=",
  red: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABhElEQVQ4y8WTy07CYBCFz5QydMFto4W4xX1J3AuFteFVvCc+gXd9lIYHKMa1StckrCm6shpCL3RcQKiKFxIXzvL/M19OzpwD/PfQ5wcRQdDpGOJ5e+J5NRmPV0nTniifv6Fs9oobjTsi+hogIinfso7j4XAvenhAPBwCYQgwQymVoBoGFF0/y7RaR0QUfQCICHzLupz0+9uhbUOCYFEvM7hWQ2p9/SzTah0QUQLwbduY9HrdoN3+evkdJLO1hVSlspFpNu+VuQLP24+63Z+XASAIEDkO5PV1BwASwPNzPXbdpZyPXRfieZsikkoA4/GqhOFSAPF9yGi0BkCdA0jTHimdXu72zCBNewQQJYBC4VYpl5cCKOUyqFjsENEkAWSz56phAL+pYIZqGKBc7uSDidxo3Cm6fsGmCWL+VjqbJhRdv2bT7AKAOv8kgogc+pY1oVzuIHIcxIPBNInp9DSJ1SoUXT+dJXG6t+CwCALbrsrLy+6sCyuzLnQon7/get1534U/zxspH6OtmBYulAAAAABJRU5ErkJggg==",
  gray: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABnklEQVQ4y8XTv0/bQBQH8O+V81GfGXJGZYEJ5LEkjieGCPiTyq9K/QugFNr/iKoeskDc0A0XRpBA2FnuItsXvQ4tLqRNFYmhb7y797l3T++A/x1sfIGIkCTnLa3NjtZmoyzLBSHEnefJz6778mMUtU4ZY38HiGgmjrv7eT7Yubj4jiwbYDSy4JzD930EwTKUahx2OmvvGGP2CUBEiOPu8fX1zZter4+qsn+UyzlHGL7G0tLiYaeztscYw4uHzSQ5b+X5YGIyAFhrkSTfkOeD3bOzfgTgN6C12U3Ty4nJj5E0vcJwONwaA/Tm/X0+VeezLIPWZp2IZmqgLKsFa+1UQFVZFEWxCIDXgBDOrePwqQDOOYQQtwBsDXie98X3/amA+XmFuTnvhDE2qgHXdT8EwTI4/3cVnHMEwQqkdA+eNDGKmqdKNY7a7VVMeorjcERRE0o1PrXbzQQA6pOMMRDR2zjujqSUe2l6hSzLYO3DJCoEwQqUarz/NYk/88ZvISL0ev3QmOG2MWajKMpXs7PiTkp54nnyKAxXvz7+C8+OH2b8r2Ld5lUAAAAAAElFTkSuQmCC",
  blue: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABkklEQVQ4y8WTwU5TURBAz9zb93xd1FoTeU/o2rjEWNdCIuAHyIeoiIlfoCLqf9QvqAuMSy3BpYnbphZNwCfGPnu5d1xUnoCoTVw4yztzzp1MZuB/hxx/UFWeb4fZ3OlK7pgbep2qWvlYj3hRq/BkKbNdETlZoKq23fP3B4WuvNoJvC8UFyA2MFMVLjcMWSJry017T0T2jwhUlXbPP373RW92Bp5v4dd2YwPXUsvFmqwtN+2qiPwUdAZ+9u1e2HrW84xOgA9LbjQtF2qmdT2zm+YgkTu983on/BEGGAXo7gb2nN4CKAWfnM73C51o8v2hkjuuqqotBYVnyoWJeEYBvnqdASqlILF8iM1kgtiM64H9EjkTycvpqkwkmK4KjUg2RMSXglpFHrUahr91ERtoNQynI3lwZIhLmelmiawvpPa3klMGFlNLlsjTxdRsAVQOkiKCqt5t97yvR3a1uxvoD8ebGBk4nwhXzhqyRB7+2MQxd/wXVaWzHS59dno7d8wVXs8l41vYqEeyvpCaN4dv4Z/jO4SHmcufJV4PAAAAAElFTkSuQmCC",
} as const;

type IconTone = keyof typeof ICON_PNG;

function makePngIcon(tone: IconTone) {
  return nativeImage.createFromBuffer(Buffer.from(ICON_PNG[tone], "base64"));
}

function getBatteryIconTone(percentage?: number): IconTone {
  if (percentage === undefined) return "gray";
  if (percentage <= 5) return "red";
  if (percentage <= 20) return "orange";
  if (percentage <= 50) return "yellow";
  return "green";
}

function makeTrayIcon(percentage?: number, charging = false) {
  return makePngIcon(charging ? "blue" : getBatteryIconTone(percentage));
}

function makeBatteryLevelIcon(percentage?: number) {
  return makePngIcon(getBatteryIconTone(percentage));
}

function makeConnectionIcon(isConnected: boolean) {
  return makePngIcon(isConnected ? "green" : "gray");
}

function getDisplayDevices(): BatteryDevice[] {
  return [...devices.values()].sort((a, b) => {
    if (a.percentage === undefined) return 1;
    if (b.percentage === undefined) return -1;
    return a.percentage - b.percentage;
  });
}

function updateTray(): void {
  const listed = getDisplayDevices();
  const t = translator(appStore?.settings.language ?? "tr");
  const active =
    listed.find((device) => !device.charging && device.percentage !== undefined) ??
    listed.find((device) => device.percentage !== undefined);

  tray.setImage(makeTrayIcon(active?.percentage, active?.charging));
  tray.setToolTip(
    listed.length
      ? listed
          .map((device) => {
            const level = device.percentage === undefined ? t("unknownBattery") : `%${device.percentage}`;
            return `${device.name}: ${level}${device.charging ? ` · ${t("charging")}` : ""}`;
          })
          .join("\n")
      : connected
        ? `${t("connected")} · ${t("noDevices")}`
        : t("waiting"),
  );

  const deviceItems: Electron.MenuItemConstructorOptions[] = listed.length
    ? listed.map((device) => ({
        label: `${device.name} — ${
          device.percentage === undefined ? t("unknownBattery") : `%${device.percentage}`
        }${device.charging ? " ⚡" : ""}`,
        icon: makeBatteryLevelIcon(device.percentage),
        enabled: false,
      }))
    : [{ label: t("noDevices"), enabled: false }];

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: connected ? t("connected") : t("waiting"),
        icon: makeConnectionIcon(connected),
        enabled: false,
      },
      { type: "separator" },
      ...deviceItems,
      { type: "separator" },
      { label: t("dashboard"), click: () => { void openDashboard(); } },
      { label: t("refresh"), click: () => client.refresh() },
      {
        label: t("launchAtStartup"),
        type: "checkbox",
        checked: appStore?.settings.launchAtStartup ?? false,
        click: (item) => { void updateSettings({ launchAtStartup: item.checked }); },
      },
      {
        label: t("language"),
        submenu: [
          { label: "Türkçe", type: "radio", checked: appStore?.settings.language === "tr", click: () => { void updateSettings({ language: "tr" }); } },
          { label: "English", type: "radio", checked: appStore?.settings.language === "en", click: () => { void updateSettings({ language: "en" }); } },
        ],
      },
      {
        label: updater.status().phase === "checking" ? t("checkingUpdates") : t("checkUpdates"),
        enabled: updater.status().phase !== "checking",
        click: () => { void updater.check(); },
      },
      ...(updater.status().phase === "ready" ? [{ label: `${t("updateReady")} (${updater.status().detail}) · ${t("restart")}`, click: () => updater.restart() }] : []),
      ...(updater.status().phase === "error" ? [{ label: `${t("updateError")}: ${updater.status().detail}`, enabled: false }] : []),
      {
        label: t("openGHub"),
        click: () => shell.openPath(path.join(process.env.ProgramFiles ?? "C:\\Program Files", "LGHUB", "lghub.exe")),
      },
      { type: "separator" },
      { label: t("exit"), click: () => app.quit() },
    ]),
  );
}

function applyLaunchAtStartup(enabled: boolean): void {
  if (process.platform !== "win32") return;
  const executablePath = process.env.PORTABLE_EXECUTABLE_FILE ?? process.execPath;
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: executablePath,
    args: process.defaultApp ? [app.getAppPath()] : [],
  });
}

async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const settings = await appStore.updateSettings(patch);
  if (patch.launchAtStartup !== undefined) applyLaunchAtStartup(settings.launchAtStartup);
  updateTray();
  await pushDashboardState();
}

function dashboardState() {
  return {
    app: { name: "Logitech Battery API", version: app.getVersion() },
    settings: appStore.settings,
    history: appStore.history,
    devices: getDisplayDevices(),
    connection: { connected, lastConnectedAt, lastDisconnectedAt, lastError: lastConnectionError },
    update: updater.status(),
    diagnostics: {
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      node: process.versions.node,
      userData: app.getPath("userData"),
      logPath: logger.filePath,
    },
  };
}

async function pushDashboardState(): Promise<void> {
  if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
  dashboardWindow.webContents.send("dashboard:state", dashboardState());
}

function diagnosticsText(): string {
  return JSON.stringify({ generatedAt: new Date().toISOString(), ...dashboardState() }, null, 2);
}

function registerDashboardIpc(): void {
  ipcMain.removeHandler("dashboard:get-state");
  ipcMain.removeHandler("dashboard:update-settings");
  ipcMain.removeHandler("dashboard:refresh");
  ipcMain.removeHandler("dashboard:reconnect");
  ipcMain.removeHandler("dashboard:check-update");
  ipcMain.removeHandler("dashboard:restart-update");
  ipcMain.removeHandler("dashboard:clear-history");
  ipcMain.removeHandler("dashboard:open-log");
  ipcMain.removeHandler("dashboard:copy-diagnostics");
  ipcMain.handle("dashboard:get-state", () => dashboardState());
  ipcMain.handle("dashboard:update-settings", async (_event, patch: Partial<AppSettings>) => updateSettings(patch));
  ipcMain.handle("dashboard:refresh", () => client.refresh());
  ipcMain.handle("dashboard:reconnect", () => client.reconnect());
  ipcMain.handle("dashboard:check-update", () => updater.check());
  ipcMain.handle("dashboard:restart-update", () => updater.restart());
  ipcMain.handle("dashboard:clear-history", async () => { await appStore.clearHistory(); await pushDashboardState(); });
  ipcMain.handle("dashboard:open-log", () => shell.showItemInFolder(logger.filePath));
  ipcMain.handle("dashboard:copy-diagnostics", () => clipboard.writeText(diagnosticsText()));
}

async function openDashboard(): Promise<void> {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.show();
    dashboardWindow.focus();
    await pushDashboardState();
    return;
  }
  const preloadDirectory = path.join(app.getPath("userData"), "runtime");
  const preloadPath = path.join(preloadDirectory, "dashboard-preload.cjs");
  await mkdir(preloadDirectory, { recursive: true });
  await writeFile(preloadPath, DASHBOARD_PRELOAD, "utf8");
  dashboardWindow = new BrowserWindow({
    width: 820,
    height: 680,
    minWidth: 620,
    minHeight: 520,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#09090b",
    title: "Logitech Battery API",
    icon: makePngIcon("green"),
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  dashboardWindow.on("closed", () => { dashboardWindow = undefined; });
  dashboardWindow.webContents.on("did-finish-load", () => { void pushDashboardState(); });
  await dashboardWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createDashboardHtml())}`);
  dashboardWindow.show();
}

function notify(device: BatteryDevice, event: BatteryEvent): void {
  const english = appStore.settings.language === "en";
  let title = device.name;
  let body = "";

  switch (event.type) {
    case "charging":
      title = english ? `${device.name} started charging` : `${device.name} şarja takıldı`;
      body = english ? `Current battery level: ${event.percentage}%` : `Mevcut pil seviyesi: %${event.percentage}`;
      break;
    case "full":
      title = english ? `${device.name} is fully charged` : `${device.name} tamamen şarj oldu`;
      body = english ? "Battery is at 100%. You can disconnect the charging cable." : "Pil seviyesi %100. Şarj kablosunu çıkarabilirsin.";
      break;
    case "low":
      title = english ? `${device.name} battery is low` : `${device.name} pili azalıyor`;
      body = english ? `Battery is at ${event.percentage}% and reached the ${event.threshold}% threshold.` : `Pil seviyesi %${event.percentage}; %${event.threshold} eşiğine ulaştı.`;
      break;
    case "empty":
      title = english ? `${device.name} battery is empty` : `${device.name} pili bitti`;
      body = english ? "Battery is at 0%. Connect the device to a charger." : "Pil seviyesi %0. Cihazı şarja takmalısın.";
      break;
  }

  if (Notification.isSupported()) {
    new Notification({ title, body, urgency: event.type === "empty" ? "critical" : "normal" }).show();
  }
}

function notifyConnection(title: string, body: string): void {
  if (Notification.isSupported()) new Notification({ title, body }).show();
}

function registerDevices(infos: GHubDeviceInfo[]): void {
  const t = translator(appStore.settings.language);
  const currentIds = new Set(infos.map((info) => info.id));
  for (const [id, device] of devices) {
    if (!currentIds.has(id) && device.connected) {
      device.connected = false;
      if (appStore.settings.notifyDisconnect) {
        notifyConnection(t("deviceOfflineTitle"), t("deviceOfflineBody", { device: device.name }));
      }
    }
  }

  for (const info of infos) {
    if (!info.capabilities?.hasBatteryStatus) continue;
    const name =
      info.extendedDisplayName ?? info.displayName ?? info.deviceModel ?? "Logitech cihazı";
    const old = devices.get(info.id);
    const nextConnected = info.isConnected !== false;
    if (old?.connected && !nextConnected && appStore.settings.notifyDisconnect) {
      notifyConnection(t("deviceOfflineTitle"), t("deviceOfflineBody", { device: name }));
    }
    devices.set(info.id, {
      id: info.id,
      stableKey: info.id,
      name,
      model: info.deviceModel ?? "unknown",
      connected: nextConnected,
      charging: old?.charging ?? false,
      fullyCharged: old?.fullyCharged ?? false,
      percentage: old?.percentage,
      mileage: old?.mileage,
      updatedAt: old?.updatedAt,
    });
  }
  updateTray();
  void pushDashboardState();
}

async function updateBattery(payload: BatteryPayload): Promise<void> {
  const device = devices.get(payload.deviceId);
  if (!device || !Number.isFinite(payload.percentage)) return;

  device.percentage = Math.max(0, Math.min(100, Math.round(payload.percentage)));
  device.connected = true;
  device.charging = Boolean(payload.charging);
  device.fullyCharged = Boolean(payload.fullyCharged || device.percentage >= 100);
  device.mileage = payload.mileage;
  device.updatedAt = Date.now();

  const result = detectBatteryEvents(store.get(device.stableKey), { ...payload, percentage: device.percentage });
  await store.set(device.stableKey, result.state);
  await appStore.recordBattery(device);
  for (const event of result.events) notify(device, event);
  updateTray();
  await pushDashboardState();
}

export function startApp(controller: UpdateController): void {
  updater = controller;
  updater.onStatus(() => {
    if (tray && !tray.isDestroyed()) updateTray();
    void pushDashboardState();
  });
  void app.whenReady().then(async () => {
    const userData = app.getPath("userData");
    store = new StateStore(userData);
    appStore = new AppStore(userData);
    logger = new AppLogger(userData);
    await Promise.all([store.load(), appStore.load()]);
    applyLaunchAtStartup(appStore.settings.launchAtStartup);
    registerDashboardIpc();
    logger.info(`Application started (${app.getVersion()})`);

    tray = new Tray(makeTrayIcon());
    tray.setIgnoreDoubleClickEvents(true);
    tray.on("click", () => { void openDashboard().catch((error) => logger.error("Dashboard could not open", error)); });
    updateTray();

    client = new GHubClient();
    client.on("connected", () => {
      connected = true;
      hasConnected = true;
      lastConnectedAt = Date.now();
      lastConnectionError = undefined;
      logger.info("Connected to G HUB");
      updateTray();
      void pushDashboardState();
    });
    client.on("disconnected", () => {
      const shouldNotify = connected && hasConnected && appStore.settings.notifyDisconnect;
      connected = false;
      lastDisconnectedAt = Date.now();
      for (const device of devices.values()) device.connected = false;
      logger.info("Disconnected from G HUB; reconnect scheduled");
      if (shouldNotify) {
        const t = translator(appStore.settings.language);
        notifyConnection(t("disconnectedTitle"), t("disconnectedBody"));
      }
      updateTray();
      void pushDashboardState();
    });
    client.on("devices", registerDevices);
    client.on("battery", (payload) => {
      void updateBattery(payload).catch((error: unknown) => {
        logger.error("Battery state could not be saved", error);
      });
    });
    client.on("error", (error) => {
      lastConnectionError = error.message;
      logger.error("G HUB WebSocket error", error);
      void pushDashboardState();
    });
    client.start();
    app.on("second-instance", () => { void openDashboard(); });
  }).catch((error: unknown) => {
    console.error("Başlatma hatası:", error);
    logger?.error("Application startup failed", error);
  });
}

app.on("before-quit", () => {
  client?.stop();
  ipcMain.removeHandler("dashboard:get-state");
  ipcMain.removeHandler("dashboard:update-settings");
  ipcMain.removeHandler("dashboard:refresh");
  ipcMain.removeHandler("dashboard:reconnect");
  ipcMain.removeHandler("dashboard:check-update");
  ipcMain.removeHandler("dashboard:restart-update");
  ipcMain.removeHandler("dashboard:clear-history");
  ipcMain.removeHandler("dashboard:open-log");
  ipcMain.removeHandler("dashboard:copy-diagnostics");
});
