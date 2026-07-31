import axiosClient from "./axiosClient";
import type { ApiResponse } from "./ApiResponse";
import type { DeviceSessionsData } from "@/types/device";

export async function getDeviceSessions(): Promise<DeviceSessionsData> {
  const response = await axiosClient.get<DeviceSessionsData, ApiResponse<DeviceSessionsData>>("/devices");
  return response.data;
}

export async function kickoutDevice(uuid: string, deviceLimitToken?: string): Promise<void> {
  await axiosClient.post("/devices/kickout-device", { uuid, deviceLimitToken });
}
