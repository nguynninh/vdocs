import { api } from "@/src/services/axios";

export interface WorkspaceApiResponse {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  role: string;
  createdAt: string;
}

export interface CreateWorkspacePayload {
  name: string;
  description?: string;
  icon?: string;
}

export const workspaceApi = {
  list: () => api.get<WorkspaceApiResponse[]>("/workspaces"),

  create: (payload: CreateWorkspacePayload) =>
    api.post<WorkspaceApiResponse>("/workspaces", payload),
};
