import { api } from "@/src/services/axios";
import type { DocumentPermission } from "../../collaboration/collaboration.types";

export type LinkAccess = "NONE" | "VIEWER" | "COMMENTER" | "EDITOR";

export interface DocumentApiResponse {
  id: string;
  workspaceId: string;
  title: string;
  icon: string | null;
  permission: DocumentPermission;
  linkAccess: LinkAccess;
  contentVersion: number;
  content: string | null;
}

export interface DocumentSummaryApiResponse {
  id: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  updatedAt: string;
}

export interface DocumentTrashApiResponse {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: string;
  archivedAt: string;
}

export interface UpdateDocumentPayload {
  title?: string;
  icon?: string;
}

export type MemberRole = "FULL_ACCESS" | "EDITOR" | "COMMENTER" | "VIEWER";

export interface DocumentMemberApiResponse {
  userId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  role: MemberRole;
}

export const documentApi = {
  create: (title?: string, workspaceId?: string, parentId?: string) =>
    api.post<{ id: string }>("/api/documents", { title, workspaceId, parentId }),

  list: (workspaceId?: string) =>
    api.get<DocumentSummaryApiResponse[]>("/api/documents", {
      params: workspaceId ? { workspaceId } : undefined,
    }),

  get: (documentId: string) =>
    api.get<DocumentApiResponse>(`/api/documents/${documentId}`),

  update: (documentId: string, payload: UpdateDocumentPayload) =>
    api.patch<{ id: string; title: string; icon: string | null }>(
      `/api/documents/${documentId}`,
      payload,
    ),

  moveToTrash: (documentId: string) =>
    api.delete<{ id: string }>(`/api/documents/${documentId}`),

  listTrash: (workspaceId?: string) =>
    api.get<DocumentTrashApiResponse[]>("/api/documents/trash", {
      params: workspaceId ? { workspaceId } : undefined,
    }),

  restore: (documentId: string) =>
    api.post<{ id: string }>(`/api/documents/${documentId}/restore`),

  permanentlyDelete: (documentId: string) =>
    api.delete<{ deleted: boolean }>(`/api/documents/${documentId}/permanent`),

  updateAccess: (documentId: string, linkAccess: LinkAccess) =>
    api.patch<{ id: string; linkAccess: LinkAccess }>(
      `/api/documents/${documentId}/access`,
      { linkAccess },
    ),

  listMembers: (documentId: string) =>
    api.get<DocumentMemberApiResponse[]>(`/api/documents/${documentId}/members`),

  inviteMember: (documentId: string, email: string, role: MemberRole) =>
    api.post<DocumentMemberApiResponse>(`/api/documents/${documentId}/members`, {
      email,
      role,
    }),

  updateMemberRole: (documentId: string, memberUserId: string, role: MemberRole) =>
    api.patch<DocumentMemberApiResponse>(
      `/api/documents/${documentId}/members/${memberUserId}`,
      { role },
    ),

  removeMember: (documentId: string, memberUserId: string) =>
    api.delete<{ removed: boolean }>(
      `/api/documents/${documentId}/members/${memberUserId}`,
    ),

  createShareLink: (documentId: string) =>
    api.post<{ token: string }>(`/api/documents/${documentId}/share`),

  revokeShareLink: (documentId: string) =>
    api.delete<{ revoked: boolean }>(`/api/documents/${documentId}/share`),

  getByShareToken: (token: string) =>
    api.get<DocumentApiResponse>(`/api/documents/share/${token}`),
};
