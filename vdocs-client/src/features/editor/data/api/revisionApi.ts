import { api } from "@/src/services/axios";

export type VersionTrigger = "auto" | "manual";

export interface VersionSummaryApiResponse {
  id: string;
  trigger: VersionTrigger;
  label: string | null;
  contentVersion: number;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
}

export interface VersionApiResponse extends VersionSummaryApiResponse {
  content: {
    blocks: Array<{ id: string; type: string; text: string }>;
    fullWidth: boolean;
    fontStyle: string;
    smallText: boolean;
  };
}

export const revisionApi = {
  list: (documentId: string) =>
    api.get<VersionSummaryApiResponse[]>(`/api/documents/${documentId}/versions`),

  get: (documentId: string, versionId: string) =>
    api.get<VersionApiResponse>(`/api/documents/${documentId}/versions/${versionId}`),

  createManual: (documentId: string, label?: string) =>
    api.post<VersionSummaryApiResponse>(`/api/documents/${documentId}/versions`, {
      label,
    }),
};
