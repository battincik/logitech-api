import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import type { BatteryPayload, GHubDeviceInfo } from "./types";

interface GHubMessage {
  path?: string;
  verb?: string;
  result?: { code?: string };
  payload?: Record<string, unknown> & {
    deviceInfos?: GHubDeviceInfo[];
    deviceId?: string;
    percentage?: number;
    charging?: boolean;
    fullyCharged?: boolean;
    criticalLevel?: boolean;
    mileage?: number;
  };
}

export interface GHubClientEvents {
  connected: [];
  disconnected: [];
  devices: [devices: GHubDeviceInfo[]];
  battery: [battery: BatteryPayload];
  error: [error: Error];
}

export class GHubClient extends EventEmitter<GHubClientEvents> {
  private socket?: WebSocket;
  private reconnectTimer?: NodeJS.Timeout;
  private pollTimer?: NodeJS.Timeout;
  private reconnectDelay = 2_000;
  private stopped = false;

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pollTimer);
    this.socket?.close();
  }

  refresh(): void {
    this.send("GET", "/devices/list");
  }

  private connect(): void {
    if (this.stopped) return;

    this.socket = new WebSocket("ws://127.0.0.1:9010", ["json"], {
      origin: "file://",
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
      },
    });

    this.socket.on("open", () => {
      this.reconnectDelay = 2_000;
      this.emit("connected");
      this.refresh();
      this.subscribe();

      clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => this.refresh(), 60_000);
    });

    this.socket.on("message", (raw) => this.handleMessage(raw.toString()));

    this.socket.on("error", (error) => {
      this.emit("error", error);
    });

    this.socket.on("close", () => {
      clearInterval(this.pollTimer);
      this.emit("disconnected");
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
  }

  private send(verb: "GET" | "SUBSCRIBE", path: string): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ msgId: randomUUID(), verb, path }));
  }

  private subscribe(): void {
    this.send("SUBSCRIBE", "/battery/state/changed");
  }

  private handleMessage(raw: string): void {
    let message: GHubMessage;
    try {
      message = JSON.parse(raw) as GHubMessage;
    } catch {
      return;
    }

    if (message.path === "/devices/list") {
      const devices = message.payload?.deviceInfos ?? [];
      this.emit("devices", devices);

      for (const device of devices) {
        if (device.capabilities?.hasBatteryStatus) {
          this.send("GET", `/battery/${device.id}/state`);
        }
      }
      return;
    }

    const isBatteryResponse =
      message.path?.startsWith("/battery/") &&
      message.path.endsWith("/state") &&
      message.path !== "/battery/state/changed";
    const isBatteryBroadcast = message.path === "/battery/state/changed";

    if ((isBatteryResponse || isBatteryBroadcast) && message.payload) {
      const { deviceId, percentage } = message.payload;
      if (typeof deviceId === "string" && typeof percentage === "number") {
        this.emit("battery", {
          deviceId,
          percentage,
          charging: message.payload.charging,
          fullyCharged: message.payload.fullyCharged,
          criticalLevel: message.payload.criticalLevel,
          mileage: message.payload.mileage,
        });
      }

      if (isBatteryBroadcast) this.subscribe();
    }
  }
}
