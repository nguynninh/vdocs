import type { DocumentPermission, LinkAccess } from "./DocumentPermission.ts";

export interface DocumentResponse {
  id: string;
  workspaceId: string;
  title: string;
  icon: string | null;
  permission: DocumentPermission;
  linkAccess: LinkAccess;
  contentVersion: number;
  content: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentUpdateResponse {
  id: string;
  title: string;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSummaryResponse {
  id: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  updatedAt: string;
}

export interface DocumentTrashResponse {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: string;
  archivedAt: string;
}
