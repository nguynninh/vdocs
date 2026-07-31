export interface DeviceSession {
  deviceId: string;
  physicalDeviceId: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  currentDevice: boolean;
}

export interface DeviceSessionsData {
  totalDevices: number;
  maxActiveDevices: number;
  deviceLimitToken: string;
  devices: DeviceSession[];
}
