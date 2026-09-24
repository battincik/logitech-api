import type { AppLanguage } from "./app-store";

const messages = {
  tr: {
    dashboard: "Kontrol paneli",
    connected: "G HUB bağlı",
    waiting: "G HUB bekleniyor",
    noDevices: "Pil destekli cihaz bulunamadı",
    unknownBattery: "Pil bilinmiyor",
    charging: "Şarj oluyor",
    refresh: "Şimdi yenile",
    checkUpdates: "Güncellemeleri denetle",
    checkingUpdates: "Güncelleme denetleniyor…",
    updateReady: "Güncelleme hazır",
    updateError: "Güncelleme hatası",
    restart: "Yeniden başlat",
    openGHub: "G HUB'ı aç",
    launchAtStartup: "Windows ile başlat",
    language: "Dil",
    exit: "Çıkış",
    disconnectedTitle: "G HUB bağlantısı kesildi",
    disconnectedBody: "Bağlantı otomatik olarak yeniden kurulmaya çalışılıyor.",
    deviceOfflineTitle: "Cihaz bağlantısı kesildi",
    deviceOfflineBody: "{device} artık çevrimdışı.",
  },
  en: {
    dashboard: "Dashboard",
    connected: "G HUB connected",
    waiting: "Waiting for G HUB",
    noDevices: "No battery-powered devices found",
    unknownBattery: "Battery unknown",
    charging: "Charging",
    refresh: "Refresh now",
    checkUpdates: "Check for updates",
    checkingUpdates: "Checking for updates…",
    updateReady: "Update ready",
    updateError: "Update error",
    restart: "Restart",
    openGHub: "Open G HUB",
    launchAtStartup: "Start with Windows",
    language: "Language",
    exit: "Quit",
    disconnectedTitle: "G HUB disconnected",
    disconnectedBody: "The app is trying to reconnect automatically.",
    deviceOfflineTitle: "Device disconnected",
    deviceOfflineBody: "{device} is now offline.",
  },
} as const;

export type MessageKey = keyof typeof messages.tr;

export function translator(language: AppLanguage) {
  return (key: MessageKey, variables: Record<string, string> = {}): string => {
    let value: string = messages[language][key];
    for (const [name, replacement] of Object.entries(variables)) {
      value = value.replaceAll(`{${name}}`, replacement);
    }
    return value;
  };
}
