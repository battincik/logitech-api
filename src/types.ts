export interface GHubDeviceInfo {
  id: string;
  deviceModel?: string;
  displayName?: string;
  extendedDisplayName?: string;
  isConnected?: boolean;
  capabilities?: {
    hasBatteryStatus?: boolean;
  };
}

export interface BatteryPayload {
  deviceId: string;
  percentage: number;
  charging?: boolean;
  fullyCharged?: boolean;
  criticalLevel?: boolean;
  mileage?: number;
}

export interface BatteryDevice {
  id: string;
  stableKey: string;
  name: string;
  model: string;
  connected: boolean;
  percentage?: number;
  charging: boolean;
  fullyCharged: boolean;
  mileage?: number;
  updatedAt?: number;
}

export interface StoredBatteryState {
  percentage: number;
  charging: boolean;
  fullyCharged: boolean;
  notifiedThresholds: number[];
  emptyNotified: boolean;
}

export interface BatteryEvent {
  type: "charging" | "full" | "low" | "empty";
  percentage: number;
  threshold?: number;
}
