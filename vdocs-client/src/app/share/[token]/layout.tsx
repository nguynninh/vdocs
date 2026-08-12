import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getApiBaseUrl } from "@/src/services/apiUrl";
import { ShareSidebar } from "../_components/ShareSidebar";

type ShareLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    token: string;
  }>;
};

interface DocumentApiResponse {
  id: string;
  title: string;
}

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data?: T;
  error?: string;
}

export default async function ShareLayout({ children, params }: ShareLayoutProps) {
  const { token } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  const response = await fetch(`${getApiBaseUrl()}/documents/share/${token}`, {
    cache: "no-store",
    headers: accessToken ? { Cookie: `accessToken=${accessToken}` } : {},
  });

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

  const rootDocument = envelope.data;

  return (
    <main>
      <SidebarProvider defaultOpen={false}>
        <ShareSidebar
          rootDocumentId={rootDocument.id}
          rootTitle={rootDocument.title}
          token={token}
        />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </main>
  );
}
