import { notFound, redirect } from "next/navigation";
import { getApiBaseUrl } from "@/src/services/apiUrl";

type WorkspaceSharePageProps = {
  params: Promise<{
    token: string;
  }>;
};

interface DocumentSummaryApiResponse {
  id: string;
  parentId: string | null;
  order: number;
  title: string;
}

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data?: T;
  error?: string;
}

export default async function WorkspaceSharePage({ params }: WorkspaceSharePageProps) {
  const { token } = await params;

  const response = await fetch(`${getApiBaseUrl()}/documents/share/workspace/${token}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`Failed to load workspace documents (${response.status})`);
  }

  const envelope: ApiEnvelope<DocumentSummaryApiResponse[]> = await response.json();
  const documents = envelope.data ?? [];

  const rootDocument = documents
    .filter((document) => !document.parentId)
    .sort((a, b) => a.order - b.order)[0];

  if (rootDocument) {
    redirect(`/share/workspace/${token}/${rootDocument.id}`);
  }

  return (
    <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">
      Workspace này chưa có tài liệu nào để hiển thị.
    </div>
  );
}
