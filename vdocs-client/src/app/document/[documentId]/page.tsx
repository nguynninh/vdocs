import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { VDocsEditor } from "@/features/editor";
import type { VDocsEditorProps } from "@/features/editor";

type DocumentPageProps = {
  params: Promise<{
    documentId: string;
  }>;
};

interface DocumentApiResponse {
  id: string;
  workspaceId: string;
  title: string;
  icon: string | null;
  permission: NonNullable<VDocsEditorProps["initialPermission"]>;
  linkAccess: NonNullable<VDocsEditorProps["initialLinkAccess"]>;
  contentVersion: number;
  content: string | null;
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

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { documentId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const response = await fetch(`${apiUrl}/api/documents/${documentId}`, {
    cache: "no-store",
    headers: accessToken ? { Cookie: `accessToken=${accessToken}` } : {},
  });

  if (response.status === 401) {
    redirect("/login");
  }

  if (response.status === 404) {
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
    <main>
      <VDocsEditor
        documentId={documentId}
        workspaceId={document.workspaceId}
        initialTitle={document.title}
        initialIcon={initialIcon}
        initialContent={initialContent}
        initialPermission={document.permission}
        initialLinkAccess={document.linkAccess}
        initialCreatedAt={document.createdAt}
        initialUpdatedAt={document.updatedAt}
      />
    </main>
  );
}
