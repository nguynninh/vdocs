export type DocumentType = "SPACE" | "PAGE";

export interface DocumentResponse {
  id: string;
  title: string | null;
  type: DocumentType;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  currentState: string;
  revision: number;
  content: string | null;
  contentRevision: number;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  locked: boolean;
}

export interface DocumentSummaryResponse {
  id: string;
  title: string | null;
  type: DocumentType;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  revision: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface DocumentCreateRequest {
  type?: DocumentType;
  parentId?: string;
  icon?: string;
  color?: string;
}
