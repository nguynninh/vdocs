export interface DocumentVersionSummaryResponse {
  id: string;
  trigger: "auto" | "manual" | "daily";
  label: string | null;
  contentVersion: number;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
}

export interface DocumentVersionResponse extends DocumentVersionSummaryResponse {
  content: {
    blocks: Array<{ id: string; type: string; text: string }>;
    fullWidth: boolean;
    fontStyle: string;
    smallText: boolean;
  };
}
