import axiosClient from "./axiosClient";
import type { ApiResponse } from "./ApiResponse";
import type { DocumentResponse } from "@/types/document";

export async function createDocument(): Promise<DocumentResponse> {
  const response = await axiosClient.post<DocumentResponse, ApiResponse<DocumentResponse>>("/documents");
  return response.data;
}
