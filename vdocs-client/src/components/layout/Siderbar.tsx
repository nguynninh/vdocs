"use client";

import {
  ChevronDown,
  ChevronsUpDown,
  Copy,
  ExternalLink,
  EyeOff,
  FolderInput,
  Grid2x2,
  HomeIcon,
  Link as LinkIcon,
  LogOut,
  PanelRight,
  PenLine,
  Plus,
  Star,
  Trash2,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator"
import CreateWorkspaceDialog, {
  type CreateWorkspaceValues,
} from "@/src/components/layout/CreateWorkspaceDialog";
import ImportDocumentDialog, {
  type ImportDocumentValues,
} from "@/src/components/layout/ImportDocumentDialog";
import { importDocumentFile } from "@/src/features/editor/import/importDocumentFile";
import type { AuthUser } from "@/src/features/auth/types";
import { useSidebarWidth } from "@/src/components/layout/sidebar-width";
import { getWorkspaceIconOption } from "@/src/components/layout/workspace-icons";
import Image from "next/image";
import Home from "@/src/app/page";
import {
  documentApi,
  type DocumentSummaryApiResponse,
} from "@/src/features/editor/data/api/documentApi";
import TreeComponent, { type TreeDataNode } from '@/src/app/components/tree/TreeComponent'

const SELECTED_WORKSPACE_STORAGE_KEY = "vdocs.selectedWorkspaceId";

function buildDocumentTree(
  documents: DocumentSummaryApiResponse[],
  untitledLabel: string
): TreeDataNode[] {
  const nodeById = new Map<string, TreeDataNode>(
    documents.map((document) => [
      document.id,
      {
        key: document.id,
        title: document.title || untitledLabel,
        link: `/document/${document.id}`,
        isLeaf: true,
        children: [],
      },
    ])
  );

  const roots: TreeDataNode[] = [];

  for (const document of documents) {
    const node = nodeById.get(document.id)!;
    const parent = document.parentId ? nodeById.get(document.parentId) : undefined;

    if (parent) {
      parent.isLeaf = false;
      (parent.children ??= []).push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

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
  onImportDocument?: (values: ImportDocumentValues) => Promise<void> | void,
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
    onImportDocument,
  } = props;
  const { state } = useSidebar();
  const personalWorkspaceLabel = `${user.name}'s workspace`;
  const personalWorkspace = workspaceGroups.find((group) => group.label === personalWorkspaceLabel);
  const teamWorkspaceGroups = workspaceGroups.filter((group) => group.id !== personalWorkspace?.id);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isImportDocumentOpen, setIsImportDocumentOpen] = useState(false);
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
    // Refetching on every pathname change (not just selectedWorkspace) picks
    // up documents created elsewhere in the tree — e.g. importing a file
    // from inside an open document, which this sidebar has no other way of
    // hearing about since it doesn't remount when you navigate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspace, pathname]);

  async function refreshDocuments() {
    if (!selectedWorkspace) return;

    try {
      const response = await documentApi.list(selectedWorkspace.id);
      setDocuments(response.data);
    } catch (error) {
      console.error("Failed to load workspace documents", error);
    }
  }

  async function handleAddChildDocument(parentId: React.Key) {
    if (!selectedWorkspace) return;

    try {
      const response = await documentApi.create(
        undefined,
        selectedWorkspace.id,
        String(parentId)
      );
      await refreshDocuments();
      router.push(`/document/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create document", error);
    }
  }

  async function handleRenameDocument(documentId: React.Key) {
    const current = documents.find((document) => document.id === documentId);
    const nextTitle = window.prompt(t("renamePrompt"), current?.title ?? "");
    if (nextTitle == null || nextTitle === current?.title) return;

    try {
      await documentApi.update(String(documentId), { title: nextTitle });
      await refreshDocuments();
    } catch (error) {
      console.error("Failed to rename document", error);
    }
  }

  async function handleCopyDocumentLink(documentId: React.Key) {
    try {
      const response = await documentApi.createShareLink(String(documentId));
      const shareUrl = `${window.location.origin}/share/${response.data.token}`;
      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      console.error("Failed to copy document link", error);
    }
  }

  function handleOpenDocumentInNewTab(documentId: React.Key) {
    window.open(`/document/${String(documentId)}`, "_blank", "noopener,noreferrer");
  }

  async function handleMoveDocumentToTrash(documentId: React.Key) {
    const current = documents.find((document) => document.id === documentId);
    const confirmed = window.confirm(
      t("confirmMoveToTrash", { title: current?.title || t("untitledDocument") })
    );
    if (!confirmed) return;

    try {
      await documentApi.moveToTrash(String(documentId));
      await refreshDocuments();

      if (pathname === `/document/${String(documentId)}`) {
        router.push("/document");
      }
    } catch (error) {
      console.error("Failed to move document to trash", error);
    }
  }

  function renderTreeItemMenu(documentId: React.Key) {
    return (
      <>
        <DropdownMenuItem disabled title={t("menuComingSoon")}>
          <Star className="h-4 w-4" />
          {t("menuAddToFavorites")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled title={t("menuComingSoon")}>
          <EyeOff className="h-4 w-4" />
          {t("menuRemoveFromRecents")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleCopyDocumentLink(documentId)}>
          <LinkIcon className="h-4 w-4" />
          {t("menuCopyLink")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled title={t("menuComingSoon")}>
          <Copy className="h-4 w-4" />
          {t("menuDuplicate")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleRenameDocument(documentId)}>
          <PenLine className="h-4 w-4" />
          {t("menuRename")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled title={t("menuComingSoon")}>
          <FolderInput className="h-4 w-4" />
          {t("menuMoveTo")}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => handleMoveDocumentToTrash(documentId)}
        >
          <Trash2 className="h-4 w-4" />
          {t("menuMoveToTrash")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled title={t("menuComingSoon")}>
          <Grid2x2 className="h-4 w-4" />
          {t("menuTurnIntoWiki")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenDocumentInNewTab(documentId)}>
          <ExternalLink className="h-4 w-4" />
          {t("menuOpenInNewTab")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled title={t("menuComingSoon")}>
          <PanelRight className="h-4 w-4" />
          {t("menuOpenInSidePeek")}
        </DropdownMenuItem>
      </>
    );
  }

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
                {menu.map(({ key, href, label, icon }) =>
                  key === "import" ? (
                    <SidebarMenuItem key={key}>
                      <SidebarMenuButton
                        tooltip={label}
                        onClick={() => setIsImportDocumentOpen(true)}
                      >
                        {icon}
                        <h3>{label}</h3>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : (
                    <SidebarMenuItem key={key}>
                      <SidebarMenuButton
                        isActive={pathname === href}
                        tooltip={label}
                        render={<Link href={href} />}>
                        {icon}
                        <h3>{label}</h3>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!selectedWorkspace && personalWorkspace && (
        <SidebarGroup>
          <SidebarGroupLabel>{t("private")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(() => {
                const { id, label, icon } = personalWorkspace;
                const { icon: Icon, className } = getWorkspaceIconOption(icon);

                return (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      tooltip={label}
                      onClick={() => handleSelectWorkspace(personalWorkspace)}
                    >
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ${className}`}>
                        <Icon className="size-3.5" strokeWidth={2.25} />
                      </span>
                      <h3 className="flex-1 truncate">{label}</h3>
                      <ChevronDown className="ml-auto size-4 shrink-0 text-sidebar-foreground/70" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })()}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {!selectedWorkspace && (
        <SidebarGroup>
          <SidebarGroupLabel>{t("workspace")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {teamWorkspaceGroups.map((group) => {
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
              <TreeComponent
                treeData={buildDocumentTree(documents, t("untitledDocument"))}
                onAdd={handleAddChildDocument}
                renderMoreMenu={renderTreeItemMenu}
              />
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
      <ImportDocumentDialog
        open={isImportDocumentOpen}
        onOpenChange={setIsImportDocumentOpen}
        onImport={
          onImportDocument ??
          (async (values) => {
            const result = await importDocumentFile(values, selectedWorkspace?.id);
            await refreshDocuments();
            return result;
          })
        }
      />
    </Sidebar>
  );
}
