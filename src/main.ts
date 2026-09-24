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
interface UpdateController {
  check: () => Promise<boolean>;
  restart: () => void;
  status: () => { phase: "idle" | "checking" | "ready" | "error"; detail?: string };
  onStatus: (callback: () => void) => void;
}
let updater: UpdateController;

let tray: Tray;
let client: GHubClient;
let store: StateStore;
let connected = false;
const devices = new Map<string, BatteryDevice>();

app.setAppUserModelId(APP_ID);

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

function getBatteryLevelColor(percentage?: number): string {
  if (percentage === undefined) return "#71717a";
  if (percentage <= 5) return "#ef4444";
  if (percentage <= 20) return "#f97316";
  if (percentage <= 50) return "#eab308";
  return "#22c55e";
}

function makeBatteryLevelIcon(percentage?: number, charging = false) {
  const safePercentage = Math.max(0, Math.min(100, percentage ?? 0));
  const fillHeight = Math.round((safePercentage / 100) * 12);
  const fillY = 16 - fillHeight;
  const color = getBatteryLevelColor(percentage);
  const outline = charging ? "#38bdf8" : color;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <defs>
        <clipPath id="level"><circle cx="10" cy="10" r="6"/></clipPath>
      </defs>
      <circle cx="10" cy="10" r="6" fill="#27272a" stroke="#a1a1aa" stroke-width="1.5"/>
      <rect x="4" y="${fillY}" width="12" height="${fillHeight}" fill="${color}" clip-path="url(#level)"/>
      <circle cx="10" cy="10" r="6" fill="none" stroke="${outline}" stroke-width="1.5"/>
    </svg>`;
  return nativeImage
    .createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`)
    .resize({ width: 16, height: 16 });
}

function makeConnectionIcon(isConnected: boolean) {
  const color = isConnected ? "#22c55e" : "#71717a";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5" fill="${color}" stroke="#ffffff" stroke-opacity="0.45"/>
    </svg>`;
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
  );
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
        icon: makeBatteryLevelIcon(device.percentage, device.charging),
        enabled: false,
      }))
    : [{ label: "Pil destekli cihaz bulunamadı", enabled: false }];

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: connected ? "G HUB bağlı" : "G HUB bekleniyor",
        icon: makeConnectionIcon(connected),
        enabled: false,
      },
      { type: "separator" },
      ...deviceItems,
      { type: "separator" },
      { label: "Şimdi yenile", click: () => client.refresh() },
      {
        label: updater.status().phase === "checking" ? "Güncelleme denetleniyor…" : "Güncellemeleri denetle",
        enabled: updater.status().phase !== "checking",
        click: () => { void updater.check(); },
      },
      ...(updater.status().phase === "ready" ? [{ label: `Güncelleme hazır (${updater.status().detail}) · Yeniden başlat`, click: () => updater.restart() }] : []),
      ...(updater.status().phase === "error" ? [{ label: `Güncelleme hatası: ${updater.status().detail}`, enabled: false }] : []),
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
      stableKey: info.id,
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
  if (!device || !Number.isFinite(payload.percentage)) return;

  device.percentage = Math.max(0, Math.min(100, Math.round(payload.percentage)));
  device.charging = Boolean(payload.charging);
  device.fullyCharged = Boolean(payload.fullyCharged || device.percentage >= 100);
  device.mileage = payload.mileage;
  device.updatedAt = Date.now();

  const result = detectBatteryEvents(store.get(device.stableKey), { ...payload, percentage: device.percentage });
  await store.set(device.stableKey, result.state);
  for (const event of result.events) notify(device, event);
  updateTray();
}

export function startApp(controller: UpdateController): void {
updater = controller;
updater.onStatus(() => { if (tray && !tray.isDestroyed()) updateTray(); });
void app.whenReady().then(async () => {
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
    devices.clear();
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
}).catch((error: unknown) => { console.error("Başlatma hatası:", error); });
}

app.on("before-quit", () => client?.stop());
