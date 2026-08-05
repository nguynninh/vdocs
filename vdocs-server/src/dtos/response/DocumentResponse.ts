import type { DocumentPermission, LinkAccess } from "./DocumentPermission.ts";

export interface DocumentResponse {
  id: string;
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
  title: string;
  icon: string | null;
  updatedAt: string;
}
