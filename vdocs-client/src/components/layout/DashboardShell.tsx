"use client";

import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { FloatButton } from "@/components/ui/float-button";
import Header from "@/src/components/layout/Header";
import Siderbar from "@/src/components/layout/Siderbar";
import { SidebarWidthProvider, useSidebarWidth } from "@/src/components/layout/sidebar-width";
import { useShellData } from "@/src/components/layout/useShellData";

function DashboardShellInner({ children }: { children: ReactNode }) {
  const { width } = useSidebarWidth();
  const {
    user,
    menu,
    workspaceGroups,
    isCreatingDocument,
    handleLogout,
    handleCreateWorkspace,
    handleCreateDocument,
  } = useShellData();

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
        <Header user={user} onLogout={handleLogout} />
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
