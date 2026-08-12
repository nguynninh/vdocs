import { notFound } from "next/navigation";
import { VDocsEditor } from "@/features/editor";
import type { VDocsEditorProps } from "@/features/editor";
import { getApiBaseUrl } from "@/src/services/apiUrl";

type WorkspaceSharedDocumentPageProps = {
  params: Promise<{
    token: string;
    documentId: string;
  }>;
};

interface DocumentApiResponse {
  id: string;
  title: string;
  icon: string | null;
  permission: NonNullable<VDocsEditorProps["initialPermission"]>;
  linkAccess: NonNullable<VDocsEditorProps["initialLinkAccess"]>;
  contentVersion: number;
  content: string | null;
  owner: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data?: T;
  error?: string;
}

function safeParseIcon(raw: string): VDocsEditorProps["initialIcon"] {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export default async function WorkspaceSharedDocumentPage({
  params,
}: WorkspaceSharedDocumentPageProps) {
  const { token, documentId } = await params;

  const response = await fetch(
    `${getApiBaseUrl()}/documents/share/workspace/${token}/${documentId}`,
    { cache: "no-store" }
  );

  if (response.status === 404 || response.status === 403) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`Failed to load document (${response.status})`);
  }

  const envelope: ApiEnvelope<DocumentApiResponse> = await response.json();

  if (!envelope.data) {
    throw new Error(envelope.error ?? envelope.message ?? "Failed to load document");
  }

  const document = envelope.data;

  const initialIcon = document.icon ? safeParseIcon(document.icon) : undefined;
  const initialContent = document.content
    ? Uint8Array.from(Buffer.from(document.content, "base64"))
    : undefined;

  return (
    <VDocsEditor
      documentId={document.id}
      workspaceShareToken={token}
      initialTitle={document.title}
      initialIcon={initialIcon}
      initialContent={initialContent}
      initialPermission={document.permission}
      initialLinkAccess={document.linkAccess}
      initialOwnerName={document.owner?.name}
      initialCreatedAt={document.createdAt}
      initialUpdatedAt={document.updatedAt}
    />
  );
}
