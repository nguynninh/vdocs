"use client";

import {
  ChevronDown,
  ChevronsUpDown,
  HomeIcon,
  LogOut,
  Plus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator"
import CreateWorkspaceDialog, {
  type CreateWorkspaceValues,
} from "@/src/components/layout/CreateWorkspaceDialog";
import type { AuthUser } from "@/src/features/auth/types";
import { useSidebarWidth } from "@/src/components/layout/sidebar-width";
import { getWorkspaceIconOption } from "@/src/components/layout/workspace-icons";
import Image from "next/image";
import Home from "@/src/app/page";
import {
  documentApi,
  type DocumentSummaryApiResponse,
} from "@/src/features/editor/data/api/documentApi";

const SELECTED_WORKSPACE_STORAGE_KEY = "vdocs.selectedWorkspaceId";

function SidebarResizeHandle() {
  const { setWidth, commitWidth, setIsResizing } = useSidebarWidth();
  const { state, isMobile } = useSidebar();
  const draggingRef = useRef(false);
  const lastWidthRef = useRef<number | null>(null);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!draggingRef.current) return;
      lastWidthRef.current = event.clientX;
      setWidth(event.clientX);
    }
    function handlePointerUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setIsResizing(false);
      document.querySelector('[data-slot="sidebar"][data-resizing="true"]')?.removeAttribute("data-resizing");
      if (lastWidthRef.current != null) commitWidth(lastWidthRef.current);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [setWidth, commitWidth, setIsResizing]);

  if (isMobile || state === "collapsed") return null;

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={(event) => {
        event.preventDefault();
        draggingRef.current = true;
        setIsResizing(true);
        event.currentTarget.closest('[data-slot="sidebar"]')?.setAttribute("data-resizing", "true");
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      className="absolute inset-y-0 right-0 z-20 w-1 cursor-col-resize touch-none hover:bg-sidebar-ring/50"
    />
  );
}

export interface ItemMenuSider {
  key: string,
  icon: React.ReactNode,
  label: string,
  href: string,
}

export interface WorkSpace {
  id: string,
  icon: string,
  label: string,
}

export interface WorkspaceGroup {
  id: string,
  label: string,
  icon: string,
}

export interface Props {
  workspace?: WorkSpace,
  workspaceGroups?: WorkspaceGroup[],
  user: AuthUser,
  menu: ItemMenuSider[],
  onLogout?: (id: string) => void,
  onCreateWorkspace?: (values: CreateWorkspaceValues) => Promise<void> | void,
}

export default function Siderbar(props: Props) {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const router = useRouter();

  const {
    workspace,
    workspaceGroups = [],
    user,
    menu,
    onLogout,
    onCreateWorkspace,
  } = props;
  const { state } = useSidebar();
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspaceState] = useState<WorkspaceGroup | null>(null);
  const [documents, setDocuments] = useState<DocumentSummaryApiResponse[]>([]);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const hasRestoredRef = useRef(false);

  function setSelectedWorkspace(group: WorkspaceGroup | null) {
    setSelectedWorkspaceState(group);

    if (group) {
      window.localStorage.setItem(SELECTED_WORKSPACE_STORAGE_KEY, group.id);
    } else {
      window.localStorage.removeItem(SELECTED_WORKSPACE_STORAGE_KEY);
    }
  }

  useEffect(() => {
    if (hasRestoredRef.current || workspaceGroups.length === 0) return;

    hasRestoredRef.current = true;
    const storedId = window.localStorage.getItem(SELECTED_WORKSPACE_STORAGE_KEY);
    const restored = storedId
      ? workspaceGroups.find((group) => group.id === storedId)
      : undefined;

    if (restored) setSelectedWorkspaceState(restored);
  }, [workspaceGroups]);

  useEffect(() => {
    if (pathname === "/dashboard") setSelectedWorkspace(null);
  }, [pathname]);

  useEffect(() => {
    if (!selectedWorkspace) {
      setDocuments([]);
      return;
    }

    let ignore = false;

    documentApi
      .list(selectedWorkspace.id)
      .then((response) => {
        if (ignore) return;
        setDocuments(response.data);
      })
      .catch((error) => {
        console.error("Failed to load workspace documents", error);
        if (!ignore) setDocuments([]);
      });

    return () => {
      ignore = true;
    };
  }, [selectedWorkspace]);

  async function handleSelectWorkspace(group: WorkspaceGroup) {
    setSelectedWorkspace(group);

    try {
      const response = await documentApi.list(group.id);
      const latestDocument = response.data[0];

      if (latestDocument) {
        router.push(`/document/${latestDocument.id}`);
      }
    } catch (error) {
      console.error("Failed to load workspace documents", error);
    }
  }

  async function handleCreateWorkspaceDocument() {
    if (!selectedWorkspace || isCreatingDocument) return;

    setIsCreatingDocument(true);

    try {
      const response = await documentApi.create(undefined, selectedWorkspace.id);
      router.push(`/document/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create document", error);
    } finally {
      setIsCreatingDocument(false);
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup className="flex h-12 flex-col items-center justify-center p-0">
          <SidebarMenu className={state === "collapsed" ? "items-center" : undefined}>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton size="lg">
                      {!selectedWorkspace ? (
                        <div
                          className={
                            state === "collapsed" ? "relative h-8 w-8" : "relative h-8 w-full"
                          }>
                          <Image
                            src={state === "collapsed" ? "/images/ic_logo_vlive_simple.png" : "/images/ic_logo_vlive.png"}
                            alt="Vlive"
                            fill
                            unoptimized
                            className={state === "collapsed" ? "object-contain object-center" : "object-contain object-left"}
                          />
                        </div>
                      ) : (
                        <>
                          {(() => {
                            const { icon: Icon, className } = getWorkspaceIconOption(
                              selectedWorkspace.icon
                            );

                            return (
                              <span
                                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${className}`}
                              >
                                <Icon className="size-4" strokeWidth={2.25} />
                              </span>
                            );
                          })()}
                          <span className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">
                              {selectedWorkspace.label}
                            </span>
                          </span>
                          <ChevronsUpDown className="ml-auto size-4" />
                        </>
                      )}
                    </SidebarMenuButton>
                  }
                />
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <Separator />

        {!selectedWorkspace && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {menu.map(({ key, href, label, icon }) => (
                  <SidebarMenuItem key={key}>
                    <SidebarMenuButton
                      isActive={pathname === href}
                      tooltip={label}
                      render={<Link href={href} />}>
                      {icon}
                      <h3>{label}</h3>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!selectedWorkspace && (
        <SidebarGroup>
          <SidebarGroupLabel>{t("workspace")}</SidebarGroupLabel>
          <SidebarGroupAction
            title={t("addWorkspace")}
            onClick={() => setIsCreateWorkspaceOpen(true)}
          >
            <Plus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceGroups.map((group) => {
                const { id, label, icon } = group;
                const { icon: Icon, className } = getWorkspaceIconOption(icon);

                return (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      tooltip={label}
                      onClick={() => handleSelectWorkspace(group)}
                    >
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ${className}`}>
                        <Icon className="size-3.5" strokeWidth={2.25} />
                      </span>
                      <h3 className="flex-1 truncate">{label}</h3>
                      <ChevronDown className="ml-auto size-4 shrink-0 text-sidebar-foreground/70" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {selectedWorkspace && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("documentIndex")}</SidebarGroupLabel>
            <SidebarGroupAction
              title={t("addDocument")}
              onClick={handleCreateWorkspaceDocument}
              disabled={isCreatingDocument}
            >
              <Plus />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {documents.map((document) => (
                  <SidebarMenuItem key={document.id}>
                    <SidebarMenuButton
                      isActive={pathname === `/document/${document.id}`}
                      tooltip={document.title || t("untitledDocument")}
                      render={<Link href={`/document/${document.id}`} />}>
                      <h3 className="truncate">
                        {document.title || t("untitledDocument")}
                      </h3>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <Separator />
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton size="lg">
                      {user.avatar ? (
                        <Image
                          src={user.avatar}
                          alt={user.name}
                          width={32}
                          height={32}
                          unoptimized
                          className="h-8 w-8 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{user.name}</span>
                        {user.email && (
                          <span className="truncate text-xs text-sidebar-foreground/70">{user.email}</span>
                        )}
                      </span>
                      <ChevronsUpDown className="ml-auto size-4" />
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => onLogout?.(user.userId || "")}>
                    <LogOut className="h-4 w-4" />
                    {t("signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
      <SidebarResizeHandle />
      <CreateWorkspaceDialog
        open={isCreateWorkspaceOpen}
        onOpenChange={setIsCreateWorkspaceOpen}
        onCreate={onCreateWorkspace}
      />
    </Sidebar>
  );
}
