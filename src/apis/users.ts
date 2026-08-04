import axiosClient from "./axiosClient";
import type { ApiResponse } from "./ApiResponse";
import type { User } from "@/types/user";

export async function getProfile(): Promise<User> {
  const response = await axiosClient.get<User, ApiResponse<User>>("/users/profile", {
    _skipAuthRefresh: true,
  });
  return response.data;
}

export async function listUsers(): Promise<User[]> {
  const response = await axiosClient.get<User[], ApiResponse<User[]>>("/users");
  return response.data;
}

export async function setUserLocked(userId: string, locked: boolean): Promise<User> {
  const response = await axiosClient.patch<User, ApiResponse<User>>(`/users/${userId}/status`, { locked });
  return response.data;
}
