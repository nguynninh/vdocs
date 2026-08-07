"use client";

import { FileText, Home, Settings, Share2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FloatButton } from "@/components/ui/float-button";
import Header from "@/src/components/layout/Header";
import Siderbar, { type ItemMenuSider, type WorkspaceGroup } from "@/src/components/layout/Siderbar";
import { SidebarWidthProvider, useSidebarWidth } from "@/src/components/layout/sidebar-width";
import { getMe, logout } from "@/src/features/auth/api";
import type { AuthUser } from "@/src/features/auth/types";
import { documentApi } from "@/src/features/editor/data/api/documentApi";
import { workspaceApi, type CreateWorkspacePayload } from "@/src/features/workspace/api";

function useDashboardMenu(): ItemMenuSider[] {
  const t = useTranslations("sidebar");

  const iconProps = { strokeWidth: 2.25, className: "text-[#4F6DF5]" };

  return [
    { key: "home", href: "/dashboard", label: t("home"), icon: <Home {...iconProps} /> },
    { key: "documents", href: "/documents", label: t("documents"), icon: <FileText {...iconProps} /> },
    { key: "import", href: "", label: t("importDocument"), icon: <Upload {...iconProps} /> },
    { key: "shared", href: "/shared", label: t("shared"), icon: <Share2 {...iconProps} /> },
    { key: "trash", href: "/trash", label: t("trash"), icon: <Trash2 {...iconProps} /> },
    { key: "settings", href: "/settings", label: t("settings"), icon: <Settings {...iconProps} /> },
  ];
}

function DashboardShellInner({ children }: { children: ReactNode }) {
  const { width } = useSidebarWidth();
  const router = useRouter();
  const pathname = usePathname();
  const isDocumentRoute = pathname?.startsWith("/document");
  const menu = useDashboardMenu();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [workspaceGroups, setWorkspaceGroups] = useState<WorkspaceGroup[]>([]);

  useEffect(() => {
    let ignore = false;

    getMe()
      .then((response) => {
        if (!ignore) setUser(response.data.user);
      })
      .catch(() => {
        if (!ignore) setUser(null);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    let ignore = false;

    workspaceApi
      .list()
      .then((response) => {
        if (ignore) return;
        setWorkspaceGroups(
          response.data.map((workspace) => ({
            id: workspace.id,
            label: workspace.name,
            icon: workspace.icon,
          }))
        );
      })
      .catch((error) => {
        console.error("Failed to load workspaces", error);
      });

    return () => {
      ignore = true;
    };
  }, [user]);

  async function handleCreateWorkspace(payload: CreateWorkspacePayload) {
    const response = await workspaceApi.create(payload);
    const workspace = response.data;

    setWorkspaceGroups((prev) => [
      ...prev,
      { id: workspace.id, label: workspace.name, icon: workspace.icon },
    ]);
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setUser(null);
      router.replace("/login");
    }
  }

  async function handleCreateDocument() {
    if (isCreatingDocument) return;

    setIsCreatingDocument(true);

    try {
      const response = await documentApi.create();
      router.push(`/document/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create document", error);
      setIsCreatingDocument(false);
    }
  }

  if (!user) return null;

  return (
    <SidebarProvider style={{ "--sidebar-width": `${width}px` } as React.CSSProperties}>
      <Siderbar
        user={user}
        menu={menu}
        workspaceGroups={workspaceGroups}
        onLogout={handleLogout}
        onCreateWorkspace={handleCreateWorkspace}
      />
      <SidebarInset>
        {!isDocumentRoute && <Header user={user} onLogout={handleLogout}/>}
        <div className="px-4">{children}</div>
        <FloatButton
          onClick={handleCreateDocument}
          disabled={isCreatingDocument}
          aria-label="Tạo tài liệu mới"
        />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <SidebarWidthProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </SidebarWidthProvider>
  );
}
