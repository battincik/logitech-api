import {
  app,
  Menu,
  nativeImage,
  Notification,
  shell,
  Tray,
} from "electron";
import path from "node:path";
import { detectBatteryEvents } from "./battery-events";
import { GHubClient } from "./ghub-client";
import { StateStore } from "./state-store";
import type {
  BatteryDevice,
  BatteryEvent,
  BatteryPayload,
  GHubDeviceInfo,
} from "./types";

const APP_ID = "net.coreor.ghubbatterytray";

let tray: Tray;
let client: GHubClient;
let store: StateStore;
let connected = false;
const devices = new Map<string, BatteryDevice>();

app.setAppUserModelId(APP_ID);

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();

function makeTrayIcon(percentage?: number, charging = false) {
  const color = charging
    ? "#38bdf8"
    : percentage === undefined
      ? "#71717a"
      : percentage <= 5
        ? "#ef4444"
        : percentage <= 20
          ? "#f59e0b"
          : "#22c55e";
  const fill = Math.max(0, Math.min(18, Math.round(((percentage ?? 0) / 100) * 18)));
  const bolt = charging
    ? '<path d="M13 4 8 13h4l-1 7 6-10h-4z" fill="#ffffff"/>'
    : "";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="4" y="8" width="23" height="16" rx="3" fill="#18181b" stroke="#ffffff" stroke-width="2"/>
      <rect x="27" y="13" width="3" height="6" rx="1" fill="#ffffff"/>
      <rect x="7" y="11" width="${fill}" height="10" rx="1" fill="${color}"/>
      ${bolt}
    </svg>`;
  const image = nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
  );
  return image.resize({ width: 16, height: 16 });
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
  const active =
    listed.find((device) => !device.charging && device.percentage !== undefined) ??
    listed.find((device) => device.percentage !== undefined);

  tray.setImage(makeTrayIcon(active?.percentage, active?.charging));
  tray.setToolTip(
    listed.length
      ? listed
          .map((device) => {
            const level = device.percentage === undefined ? "Bilinmiyor" : `%${device.percentage}`;
            return `${device.name}: ${level}${device.charging ? " · Şarj oluyor" : ""}`;
          })
          .join("\n")
      : connected
        ? "G HUB bağlı · Pil destekli cihaz bulunamadı"
        : "G HUB bağlantısı bekleniyor",
  );

  const deviceItems: Electron.MenuItemConstructorOptions[] = listed.length
    ? listed.map((device) => ({
        label: `${device.name} — ${
          device.percentage === undefined ? "Pil bilinmiyor" : `%${device.percentage}`
        }${device.charging ? " ⚡" : ""}`,
        enabled: false,
      }))
    : [{ label: "Pil destekli cihaz bulunamadı", enabled: false }];

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: connected ? "● G HUB bağlı" : "○ G HUB bekleniyor",
        enabled: false,
      },
      { type: "separator" },
      ...deviceItems,
      { type: "separator" },
      { label: "Şimdi yenile", click: () => client.refresh() },
      {
        label: "G HUB'ı aç",
        click: () => shell.openPath(path.join(process.env.ProgramFiles ?? "C:\\Program Files", "LGHUB", "lghub.exe")),
      },
      { type: "separator" },
      { label: "Çıkış", click: () => app.quit() },
    ]),
  );
}

function notify(device: BatteryDevice, event: BatteryEvent): void {
  let title = device.name;
  let body = "";

  switch (event.type) {
    case "charging":
      title = `${device.name} şarja takıldı`;
      body = `Mevcut pil seviyesi: %${event.percentage}`;
      break;
    case "full":
      title = `${device.name} tamamen şarj oldu`;
      body = "Pil seviyesi %100. Şarj kablosunu çıkarabilirsin.";
      break;
    case "low":
      title = `${device.name} pili azalıyor`;
      body = `Pil seviyesi %${event.percentage}; %${event.threshold} eşiğine ulaştı.`;
      break;
    case "empty":
      title = `${device.name} pili bitti`;
      body = "Pil seviyesi %0. Cihazı şarja takmalısın.";
      break;
  }

  if (Notification.isSupported()) {
    new Notification({ title, body, urgency: event.type === "empty" ? "critical" : "normal" }).show();
  }
}

function registerDevices(infos: GHubDeviceInfo[]): void {
  const currentIds = new Set(infos.map((info) => info.id));
  for (const id of devices.keys()) {
    if (!currentIds.has(id)) devices.delete(id);
  }

  for (const info of infos) {
    if (!info.capabilities?.hasBatteryStatus) continue;
    const name =
      info.extendedDisplayName ?? info.displayName ?? info.deviceModel ?? "Logitech cihazı";
    const old = devices.get(info.id);
    devices.set(info.id, {
      id: info.id,
      stableKey: `${info.deviceModel ?? "unknown"}:${name}`,
      name,
      model: info.deviceModel ?? "unknown",
      connected: info.isConnected !== false,
      charging: old?.charging ?? false,
      fullyCharged: old?.fullyCharged ?? false,
      percentage: old?.percentage,
      mileage: old?.mileage,
      updatedAt: old?.updatedAt,
    });
  }
  updateTray();
}

async function updateBattery(payload: BatteryPayload): Promise<void> {
  const device = devices.get(payload.deviceId);
  if (!device) return;

  device.percentage = Math.max(0, Math.min(100, Math.round(payload.percentage)));
  device.charging = Boolean(payload.charging);
  device.fullyCharged = Boolean(payload.fullyCharged || device.percentage >= 100);
  device.mileage = payload.mileage;
  device.updatedAt = Date.now();

  const result = detectBatteryEvents(store.get(device.stableKey), payload);
  await store.set(device.stableKey, result.state);
  for (const event of result.events) notify(device, event);
  updateTray();
}

app.whenReady().then(async () => {
  store = new StateStore(app.getPath("userData"));
  await store.load();

  tray = new Tray(makeTrayIcon());
  tray.setIgnoreDoubleClickEvents(true);
  updateTray();

  client = new GHubClient();
  client.on("connected", () => {
    connected = true;
    updateTray();
  });
  client.on("disconnected", () => {
    connected = false;
    updateTray();
  });
  client.on("devices", registerDevices);
  client.on("battery", (payload) => {
    void updateBattery(payload).catch((error: unknown) => {
      console.error("Pil durumu kaydedilemedi:", error);
    });
  });
  client.on("error", () => {
    connected = false;
    updateTray();
  });
  client.start();
});

app.on("before-quit", () => client?.stop());
