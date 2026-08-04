import axiosClient from "./axiosClient";
import type { ApiResponse } from "./ApiResponse";
import type { Role } from "@/types/role";

export async function listRoles(): Promise<Role[]> {
  const response = await axiosClient.get<Role[], ApiResponse<Role[]>>("/roles");
  return response.data;
}
