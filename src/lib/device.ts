import { appInfo } from "@/constants/appInfos";

export type OsType = "web" | "ios" | "android";

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  fcmToken: string;
  osType: OsType;
  osVersion: string;
  appVersion: string;
  deviceModel: string;
}

const STORAGE_KEY = "deviceInfo";

function detectOs(): Pick<DeviceInfo, "osType" | "osVersion" | "deviceModel"> {
  const ua = navigator.userAgent;

  const android = ua.match(/Android\s([\d.]+).*?;\s([^;)]+)\s?(?:Build|\))/);
  if (android) {
    return { osType: "android", osVersion: android[1], deviceModel: android[2].trim() };
  }

  const ios = ua.match(/(iPhone|iPad|iPod).*?OS\s([\d_]+)/);
  if (ios) {
    return { osType: "ios", osVersion: ios[2].replace(/_/g, "."), deviceModel: ios[1] };
  }

  return { osType: "web", osVersion: ua, deviceModel: navigator.platform };
}

function createDeviceInfo(): DeviceInfo {
  const { osType, osVersion, deviceModel } = detectOs();
  return {
    deviceId: crypto.randomUUID(),
    deviceName: deviceModel,
    fcmToken: "",
    osType,
    osVersion,
    appVersion: appInfo.APP_VERSION,
    deviceModel,
  };
}

// Creates a DeviceInfo once on first app launch and persists it in
// localStorage so the same deviceId/info is reused for the app's lifetime.
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined") {
    throw new Error("getDeviceInfo can only be used in the browser");
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as DeviceInfo;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const info = createDeviceInfo();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  return info;
}
