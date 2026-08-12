import { notFound } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getApiBaseUrl } from "@/src/services/apiUrl";
import { WorkspaceShareSidebar } from "../_components/WorkspaceShareSidebar";

type WorkspaceShareLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    token: string;
  }>;
};

interface WorkspaceApiResponse {
  id: string;
  name: string;
  icon: string;
  permission: string;
}

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data?: T;
  error?: string;
}

export default async function WorkspaceShareLayout({
  children,
  params,
}: WorkspaceShareLayoutProps) {
  const { token } = await params;

  const response = await fetch(`${getApiBaseUrl()}/workspaces/share/${token}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`Failed to load workspace (${response.status})`);
  }

  const envelope: ApiEnvelope<WorkspaceApiResponse> = await response.json();

  if (!envelope.data) {
    throw new Error(envelope.error ?? envelope.message ?? "Failed to load workspace");
  }

  const workspace = envelope.data;

  return (
    <main>
      <SidebarProvider defaultOpen={false}>
        <WorkspaceShareSidebar workspaceName={workspace.name} token={token} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </main>
  );
}
