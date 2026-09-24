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

const APP_ID = "com.battincik.logitechbatteryapi";
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
        icon: makeBatteryLevelIcon(device.percentage),
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
