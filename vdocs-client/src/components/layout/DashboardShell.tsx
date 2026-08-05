"use client";

import { FileText, Home, Settings, Share2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FloatButton } from "@/components/ui/float-button";
import Header from "@/src/components/layout/Header";
import Siderbar, { type ItemMenuSider } from "@/src/components/layout/Siderbar";
import { SidebarWidthProvider, useSidebarWidth } from "@/src/components/layout/sidebar-width";
import { getMe, logout } from "@/src/features/auth/api";
import type { AuthUser } from "@/src/features/auth/types";
import { documentApi } from "@/src/features/editor/data/api/documentApi";

function useDashboardMenu(): ItemMenuSider[] {
  const t = useTranslations("sidebar");

  return [
    { key: "home", href: "/dashboard", label: t("home"), icon: <Home /> },
    { key: "documents", href: "/documents", label: t("documents"), icon: <FileText /> },
    { key: "shared", href: "/shared", label: t("shared"), icon: <Share2 /> },
    { key: "trash", href: "/trash", label: t("trash"), icon: <Trash2 /> },
    { key: "settings", href: "/settings", label: t("settings"), icon: <Settings /> },
  ];
}

function DashboardShellInner({ children }: { children: ReactNode }) {
  const { width } = useSidebarWidth();
  const router = useRouter();
  const menu = useDashboardMenu();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);

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
      <Siderbar user={user} menu={menu} onLogout={handleLogout} />
      <SidebarInset>
        <Header user={user} onLogout={handleLogout}/>
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
