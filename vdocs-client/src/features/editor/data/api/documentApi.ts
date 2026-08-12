import { api } from "@/src/services/axios";
import { getApiBaseUrl } from "@/src/services/apiUrl";
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
  order: number;
  title: string;
  icon: string | null;
  updatedAt: string;
  favorite?: boolean;
  shared?: boolean;
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
  parentId?: string | null;
  order?: number;
}

export interface FileApiResponse {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
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
    api.post<{ id: string }>("/documents", { title, workspaceId, parentId }),

  list: (workspaceId?: string) =>
    api.get<DocumentSummaryApiResponse[]>("/documents", {
      params: workspaceId ? { workspaceId } : undefined,
    }),

  get: (documentId: string) =>
    api.get<DocumentApiResponse>(`/documents/${documentId}`),

  listChildren: (documentId: string, shareToken?: string) =>
    api.get<DocumentSummaryApiResponse[]>(`/documents/${documentId}/children`, {
      params: shareToken ? { shareToken } : undefined,
    }),

  update: (documentId: string, payload: UpdateDocumentPayload) =>
    api.patch<{ id: string; title: string; icon: string | null }>(
      `/documents/${documentId}`,
      payload,
    ),

  moveToTrash: (documentId: string) =>
    api.delete<{ id: string }>(`/documents/${documentId}`),

  listTrash: (workspaceId?: string) =>
    api.get<DocumentTrashApiResponse[]>("/documents/trash", {
      params: workspaceId ? { workspaceId } : undefined,
    }),

  restore: (documentId: string) =>
    api.post<{ id: string }>(`/documents/${documentId}/restore`),

  permanentlyDelete: (documentId: string) =>
    api.delete<{ deleted: boolean }>(`/documents/${documentId}/permanent`),

  updateAccess: (documentId: string, linkAccess: LinkAccess) =>
    api.patch<{ id: string; linkAccess: LinkAccess }>(
      `/documents/${documentId}/access`,
      { linkAccess },
    ),

  listMembers: (documentId: string) =>
    api.get<DocumentMemberApiResponse[]>(`/documents/${documentId}/members`),

  inviteMember: (documentId: string, email: string, role: MemberRole) =>
    api.post<DocumentMemberApiResponse>(`/documents/${documentId}/members`, {
      email,
      role,
    }),

  updateMemberRole: (documentId: string, memberUserId: string, role: MemberRole) =>
    api.patch<DocumentMemberApiResponse>(
      `/documents/${documentId}/members/${memberUserId}`,
      { role },
    ),

  removeMember: (documentId: string, memberUserId: string) =>
    api.delete<{ removed: boolean }>(
      `/documents/${documentId}/members/${memberUserId}`,
    ),

  createShareLink: (documentId: string) =>
    api.post<{ token: string }>(`/documents/${documentId}/share`),

  revokeShareLink: (documentId: string) =>
    api.delete<{ revoked: boolean }>(`/documents/${documentId}/share`),

  getByShareToken: (token: string) =>
    api.get<DocumentApiResponse>(`/documents/share/${token}`),

  addFavorite: (documentId: string) =>
    api.post<{ favorited: boolean }>(`/documents/${documentId}/favorite`),

  removeFavorite: (documentId: string) =>
    api.delete<{ favorited: boolean }>(`/documents/${documentId}/favorite`),

  getFavoritesCount: () =>
    api.get<{ count: number }>("/documents/favorites/count"),

  getSharedCount: () =>
    api.get<{ count: number }>("/documents/shared/count"),

  uploadFile: (documentId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<FileApiResponse>(
      `/files/documents/${documentId}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },
};

export function resolveFileUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  const path = url.startsWith("/api/") ? url.slice(4) : url;
  return `${getApiBaseUrl()}${path}`;
}
