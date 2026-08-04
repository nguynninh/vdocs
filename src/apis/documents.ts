import axiosClient from "./axiosClient";
import type { ApiResponse } from "./ApiResponse";
import type { DocumentCreateRequest, DocumentResponse, DocumentSummaryResponse } from "@/types/document";

export async function listDocuments(): Promise<DocumentSummaryResponse[]> {
  const response = await axiosClient.get<DocumentSummaryResponse[], ApiResponse<DocumentSummaryResponse[]>>(
    "/documents"
  );
  return response.data;
}

export async function listSpaces(): Promise<DocumentSummaryResponse[]> {
  const response = await axiosClient.get<DocumentSummaryResponse[], ApiResponse<DocumentSummaryResponse[]>>(
    "/documents/spaces"
  );
  return response.data;
}

export async function listChildren(documentId: string): Promise<DocumentSummaryResponse[]> {
  const response = await axiosClient.get<DocumentSummaryResponse[], ApiResponse<DocumentSummaryResponse[]>>(
    `/documents/${documentId}/children`
  );
  return response.data;
}

export async function createDocument(request?: DocumentCreateRequest): Promise<DocumentResponse> {
  const response = await axiosClient.post<DocumentResponse, ApiResponse<DocumentResponse>>(
    "/documents",
    request
  );
  return response.data;
}

export async function createSpace(name: string, icon: string, color: string): Promise<DocumentResponse> {
  const document = await createDocument({ type: "SPACE", icon, color });
  return renameDocument(document.id, name);
}

export async function createPage(parentId: string): Promise<DocumentResponse> {
  return createDocument({ type: "PAGE", parentId });
}

export async function getDocument(documentId: string): Promise<DocumentResponse> {
  const response = await axiosClient.get<DocumentResponse, ApiResponse<DocumentResponse>>(
    `/documents/${documentId}`
  );
  return response.data;
}

export async function renameDocument(documentId: string, title: string): Promise<DocumentResponse> {
  const response = await axiosClient.patch<DocumentResponse, ApiResponse<DocumentResponse>>(
    `/documents/${documentId}`,
    { title }
  );
  return response.data;
}

export async function saveDocumentContent(
  documentId: string,
  content: string,
  expectedRevision: number
): Promise<DocumentResponse> {
  const response = await axiosClient.patch<DocumentResponse, ApiResponse<DocumentResponse>>(
    `/documents/${documentId}/content`,
    { content, expectedRevision }
  );
  return response.data;
}

export async function trashDocument(documentId: string): Promise<void> {
  await axiosClient.delete<void, ApiResponse<void>>(`/documents/${documentId}`);
}

export async function setDocumentLocked(documentId: string, locked: boolean): Promise<DocumentResponse> {
  const response = await axiosClient.patch<DocumentResponse, ApiResponse<DocumentResponse>>(
    `/documents/${documentId}/lock`,
    { locked }
  );
  return response.data;
}

export async function moveDocument(documentId: string, parentId: string | null): Promise<DocumentResponse> {
  const response = await axiosClient.patch<DocumentResponse, ApiResponse<DocumentResponse>>(
    `/documents/${documentId}/move`,
    { parentId }
  );
  return response.data;
}
