import { BrowserWindow, ipcMain, screen } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppSettings } from "./app-store";
import type { BatteryDevice } from "./types";
import { selectTaskbarReading, type TaskbarReading } from "./taskbar-reading";

const WIDTH = 94;
const PRELOAD = `const { ipcRenderer } = require('electron');
window.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('button');
  const level = document.getElementById('level');
  button.addEventListener('click', () => ipcRenderer.send('taskbar:open'));
  ipcRenderer.on('taskbar:state', (_event, state) => {
    level.textContent = state.percentage == null ? '—' : state.percentage + '%';
    button.dataset.tone = state.tone;
    button.title = state.name ? state.name + ': ' + level.textContent + (state.charging ? ' ⚡' : '') : state.waiting;
    button.setAttribute('aria-label', button.title);
  });
});`;

const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:transparent;font-family:'Segoe UI',sans-serif}
button{width:100%;height:100%;border:0;border-radius:7px;background:#15181edc;color:#f2f3f5;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 7px;cursor:pointer;font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}
button:hover,button:focus-visible{background:#30343c;outline:1px solid #ffffff30}svg{width:16px;height:16px;flex:none;stroke:currentColor}button[data-tone=low]{color:#ff9a70}button[data-tone=charging]{color:#8fddbd}button[data-tone=neutral]{color:#9299a5}
</style></head><body><button type="button" aria-label="Battery" data-tone="neutral"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 13v-2a8 8 0 0 1 16 0v2M4 13h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 1-2Zm16 0h-2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-1-2Z"/></svg><span id="level">—</span></button></body></html>`;

export class TaskbarWidget {
  private window?: BrowserWindow;
  private reading: TaskbarReading = { name: "", charging: false, tone: "neutral" };
  private settings?: AppSettings;
  private waiting = "Waiting for G HUB";

  constructor(private readonly userData: string, private readonly openDashboard: () => void) {
    if (process.platform !== "win32") return;
    ipcMain.on("taskbar:open", (event) => {
      if (event.sender === this.window?.webContents) this.openDashboard();
    });
    const reposition = () => this.position();
    screen.on("display-metrics-changed", reposition);
    screen.on("display-added", reposition);
    screen.on("display-removed", reposition);
  }

  update(devices: BatteryDevice[], connected: boolean, settings: AppSettings, waiting: string): void {
    if (process.platform !== "win32") return;
    this.settings = settings;
    this.waiting = waiting;
    this.reading = selectTaskbarReading(devices, connected);
    if (!settings.taskbarWidget) {
      this.window?.hide();
      return;
    }
    if (!this.window) void this.create().catch((error: unknown) => console.error("Taskbar widget could not open:", error));
    this.position();
    this.sendState();
  }

  private async create(): Promise<void> {
    if (this.window) return;
    const preloadDirectory = path.join(this.userData, "runtime");
    await mkdir(preloadDirectory, { recursive: true });
    const preloadPath = path.join(preloadDirectory, "taskbar-preload.cjs");
    await writeFile(preloadPath, PRELOAD, "utf8");
    if (!this.settings?.taskbarWidget || this.window) return;
    const window = new BrowserWindow({
      width: WIDTH, height: 36, show: false, frame: false, transparent: true,
      resizable: false, movable: false, skipTaskbar: true, focusable: true,
      autoHideMenuBar: true, webPreferences: {
        preload: preloadPath, contextIsolation: true, nodeIntegration: false, sandbox: false,
      },
    });
    this.window = window;
    window.setAlwaysOnTop(true, "normal");
    window.on("closed", () => { if (this.window === window) this.window = undefined; });
    window.webContents.on("did-finish-load", () => { this.sendState(); this.position(); });
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(HTML)}`);
  }

  private position(): void {
    if (!this.window || this.window.isDestroyed() || !this.settings?.taskbarWidget) return;
    const display = screen.getPrimaryDisplay();
    const bottomTaskbarHeight = display.bounds.y + display.bounds.height - (display.workArea.y + display.workArea.height);
    // Auto-hidden and vertical/top taskbars have no usable bottom strip.
    if (bottomTaskbarHeight < 30 || bottomTaskbarHeight > 100 ||
        display.workArea.x !== display.bounds.x || display.workArea.y !== display.bounds.y) {
      this.window.hide();
      return;
    }
    const height = Math.min(36, bottomTaskbarHeight - 4);
    const x = display.bounds.x + display.bounds.width - WIDTH - this.settings.taskbarWidgetOffset;
    const y = display.bounds.y + display.bounds.height - Math.round((bottomTaskbarHeight + height) / 2);
    this.window.setBounds({ x, y, width: WIDTH, height });
    if (!this.window.webContents.isLoading()) this.window.showInactive();
  }

  private sendState(): void {
    if (!this.window || this.window.isDestroyed() || this.window.webContents.isLoading()) return;
    this.window.webContents.send("taskbar:state", { ...this.reading, waiting: this.waiting });
  }

  destroy(): void {
    ipcMain.removeAllListeners("taskbar:open");
    this.window?.destroy();
    this.window = undefined;
  }
}
