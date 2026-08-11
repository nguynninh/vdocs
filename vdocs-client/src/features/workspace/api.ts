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

export type WorkspaceMemberRole = "OWNER" | "MEMBER";

export interface WorkspaceMemberApiResponse {
  userId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  role: WorkspaceMemberRole;
  joinedAt: string;
}

export interface UserDirectoryApiResponse {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
}

export interface UserDirectoryListApiResponse {
  items: UserDirectoryApiResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LarkDepartmentApiResponse {
  id: string;
  name: string;
  parentId: string;
  memberCount: number;
}

export interface LarkMemberApiResponse {
  larkUserId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  jobTitle: string | null;
  departmentId: string | null;
}

export interface LarkMemberListApiResponse {
  items: LarkMemberApiResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export const workspaceApi = {
  list: () => api.get<WorkspaceApiResponse[]>("/workspaces"),

  create: (payload: CreateWorkspacePayload) =>
    api.post<WorkspaceApiResponse>("/workspaces", payload),

  listMembers: (workspaceId: string) =>
    api.get<WorkspaceMemberApiResponse[]>(`/workspaces/${workspaceId}/members`),

  inviteMember: (workspaceId: string, email: string, role: WorkspaceMemberRole) =>
    api.post<WorkspaceMemberApiResponse>(`/workspaces/${workspaceId}/members`, {
      email,
      role,
    }),

  updateMemberRole: (workspaceId: string, userId: string, role: WorkspaceMemberRole) =>
    api.patch<WorkspaceMemberApiResponse>(
      `/workspaces/${workspaceId}/members/${userId}`,
      { role }
    ),

  removeMember: (workspaceId: string, userId: string) =>
    api.delete<{ removed: boolean }>(`/workspaces/${workspaceId}/members/${userId}`),

  searchUsers: (
    workspaceId: string,
    params: { query?: string; page?: number; pageSize?: number }
  ) =>
    api.get<UserDirectoryListApiResponse>(`/workspaces/${workspaceId}/users`, { params }),

  inviteUsersBatch: (workspaceId: string, userIds: string[], role: WorkspaceMemberRole) =>
    api.post<WorkspaceMemberApiResponse[]>(`/workspaces/${workspaceId}/members/batch`, {
      userIds,
      role,
    }),

  listLarkDepartments: (workspaceId: string) =>
    api.get<LarkDepartmentApiResponse[]>(`/workspaces/${workspaceId}/lark/departments`),

  listLarkMembers: (
    workspaceId: string,
    params: { departmentId?: string; query?: string; page?: number; pageSize?: number }
  ) =>
    api.get<LarkMemberListApiResponse>(`/workspaces/${workspaceId}/lark/members`, {
      params,
    }),

  inviteLarkMembers: (workspaceId: string, larkUserIds: string[], role: WorkspaceMemberRole) =>
    api.post<WorkspaceMemberApiResponse[]>(`/workspaces/${workspaceId}/members/lark`, {
      larkUserIds,
      role,
    }),
};
