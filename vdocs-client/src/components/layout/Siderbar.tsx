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
import {
  documentApi,
  type DocumentSummaryApiResponse,
} from "@/src/features/editor/data/api/documentApi";
import TreeComponent, { type TreeDataNode, type TreeReorderUpdate } from '@/src/app/components/tree/TreeComponent'
import { onDocumentMetadataUpdated } from "@/src/features/editor/data/documentEvents";
import type { PageIcon } from "@/src/features/editor/ui/icon-picker/PageIcon";
import { PageIconGlyph } from "@/src/features/editor/ui/icon-picker/PageIconGlyph";

export const SELECTED_WORKSPACE_STORAGE_KEY = "vdocs.selectedWorkspaceId";

function safeParseIcon(raw: string | null): PageIcon | undefined {
  if (!raw) return undefined;

  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function renderDocumentIcon(raw: string | null) {
  const icon = safeParseIcon(raw);
  if (!icon) return undefined;

  return (
    <PageIconGlyph
      icon={icon}
      emojiClassName="text-sm leading-none"
      iconClassName="size-3.5"
      imageClassName="size-4 rounded object-cover"
    />
  );
}

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
        icon: renderDocumentIcon(document.icon),
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

function useWorkspaceTree(
  workspaceId: string | undefined,
  untitledLabel: string,
  router: ReturnType<typeof useRouter>,
  pathname: string
) {
  const [documents, setDocuments] = useState<DocumentSummaryApiResponse[]>([]);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      setDocuments([]);
      return;
    }

    let ignore = false;

    documentApi
      .list(workspaceId)
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
    // Refetching on every pathname change (not just workspaceId) picks up
    // documents created elsewhere in the tree — e.g. importing a file from
    // inside an open document, which this sidebar has no other way of
    // hearing about since it doesn't remount when you navigate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, pathname]);

  useEffect(() => {
    return onDocumentMetadataUpdated(({ documentId, title, icon }) => {
      if (title === undefined && icon === undefined) return;

      setDocuments((prev) =>
        prev.map((document) =>
          document.id === documentId
            ? {
                ...document,
                title: title ?? document.title,
                icon: icon === undefined ? document.icon : icon || null,
              }
            : document
        )
      );
    });
  }, []);

  async function refresh() {
    if (!workspaceId) return;

    try {
      const response = await documentApi.list(workspaceId);
      setDocuments(response.data);
    } catch (error) {
      console.error("Failed to load workspace documents", error);
    }
  }

  async function createDocument() {
    if (!workspaceId || isCreatingDocument) return;

    setIsCreatingDocument(true);

    try {
      const response = await documentApi.create(undefined, workspaceId);
      router.push(`/document/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create document", error);
    } finally {
      setIsCreatingDocument(false);
    }
  }

  async function addChildDocument(parentId: React.Key) {
    if (!workspaceId) return;

    try {
      const response = await documentApi.create(undefined, workspaceId, String(parentId));
      await refresh();
      router.push(`/document/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create document", error);
    }
  }

  async function renameDocument(documentId: React.Key, t: (key: string, values?: any) => string) {
    const current = documents.find((document) => document.id === documentId);
    const nextTitle = window.prompt(t("renamePrompt"), current?.title ?? "");
    if (nextTitle == null || nextTitle === current?.title) return;

    try {
      await documentApi.update(String(documentId), { title: nextTitle });
      await refresh();
    } catch (error) {
      console.error("Failed to rename document", error);
    }
  }

  async function copyDocumentLink(documentId: React.Key) {
    try {
      const response = await documentApi.createShareLink(String(documentId));
      const shareUrl = `${window.location.origin}/share/${response.data.token}`;
      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      console.error("Failed to copy document link", error);
    }
  }

  function openDocumentInNewTab(documentId: React.Key) {
    window.open(`/document/${String(documentId)}`, "_blank", "noopener,noreferrer");
  }

  async function moveDocumentToTrash(documentId: React.Key, t: (key: string, values?: any) => string) {
    const current = documents.find((document) => document.id === documentId);
    const confirmed = window.confirm(
      t("confirmMoveToTrash", { title: current?.title || t("untitledDocument") })
    );
    if (!confirmed) return;

    try {
      await documentApi.moveToTrash(String(documentId));
      await refresh();

      if (pathname === `/document/${String(documentId)}`) {
        router.push("/document");
      }
    } catch (error) {
      console.error("Failed to move document to trash", error);
    }
  }

  async function toggleFavorite(documentId: React.Key) {
    const current = documents.find((document) => document.id === documentId);
    try {
      if (current?.favorite) {
        await documentApi.removeFavorite(String(documentId));
      } else {
        await documentApi.addFavorite(String(documentId));
      }
      await refresh();
    } catch (error) {
      console.error("Failed to toggle favorite", error);
    }
  }

  async function reorderDocuments(updates: TreeReorderUpdate[]) {
    try {
      await Promise.all(
        updates.map(({ id, parentId, order }) =>
          documentApi.update(String(id), {
            parentId: parentId == null ? null : String(parentId),
            order,
          })
        )
      );
      await refresh();
    } catch (error) {
      console.error("Failed to save document order", error);
    }
  }

  return {
    documents,
    treeData: buildDocumentTree(documents, untitledLabel),
    isCreatingDocument,
    refresh,
    createDocument,
    addChildDocument,
    renameDocument,
    copyDocumentLink,
    openDocumentInNewTab,
    moveDocumentToTrash,
    toggleFavorite,
    reorderDocuments,
  };
}

function SidebarResizeHandle() {
  const { setWidth, commitWidth, setIsResizing } = useSidebarWidth();
  const { state, isMobile, toggleSidebar } = useSidebar();
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
  description?: string | null,
  role?: string,
  createdAt?: string,
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
  const { state, toggleSidebar } = useSidebar();
  const personalWorkspaceLabel = `${user.name}'s workspace`;
  const personalWorkspace = workspaceGroups.find((group) => group.label === personalWorkspaceLabel);
  const teamWorkspaceGroups = workspaceGroups.filter((group) => group.id !== personalWorkspace?.id);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isImportDocumentOpen, setIsImportDocumentOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspaceState] = useState<WorkspaceGroup | null>(() => {
    if (typeof window === "undefined") return null;
    const storedId = window.localStorage.getItem(SELECTED_WORKSPACE_STORAGE_KEY);
    return storedId ? { id: storedId, label: "", icon: "" } : null;
  });
  const untitledLabel = t("untitledDocument");
  const personalTree = useWorkspaceTree(personalWorkspace?.id, untitledLabel, router, pathname);
  const teamTree = useWorkspaceTree(selectedWorkspace?.id, untitledLabel, router, pathname);

  function setSelectedWorkspace(group: WorkspaceGroup | null) {
    setSelectedWorkspaceState(group);

    if (group) {
      window.localStorage.setItem(SELECTED_WORKSPACE_STORAGE_KEY, group.id);
    } else {
      window.localStorage.removeItem(SELECTED_WORKSPACE_STORAGE_KEY);
    }
  }

  useEffect(() => {
    if (!selectedWorkspace || selectedWorkspace.label) return;

    const hydrated = workspaceGroups.find((group) => group.id === selectedWorkspace.id);
    if (hydrated) setSelectedWorkspaceState(hydrated);
  }, [workspaceGroups, selectedWorkspace]);

  useEffect(() => {
    if (pathname === "/dashboard") setSelectedWorkspace(null);
  }, [pathname]);

  function renderTreeItemMenu(tree: ReturnType<typeof useWorkspaceTree>) {
    return (documentId: React.Key) => {
      const isFavorite = tree.documents.find((document) => document.id === documentId)?.favorite;

      return (
      <>
        <DropdownMenuItem onClick={() => tree.toggleFavorite(documentId)}>
          <Star className="h-4 w-4" />
          {isFavorite ? t("menuRemoveFromFavorites") : t("menuAddToFavorites")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled title={t("menuComingSoon")}>
          <EyeOff className="h-4 w-4" />
          {t("menuRemoveFromRecents")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => tree.copyDocumentLink(documentId)}>
          <LinkIcon className="h-4 w-4" />
          {t("menuCopyLink")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled title={t("menuComingSoon")}>
          <Copy className="h-4 w-4" />
          {t("menuDuplicate")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => tree.renameDocument(documentId, t)}>
          <PenLine className="h-4 w-4" />
          {t("menuRename")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled title={t("menuComingSoon")}>
          <FolderInput className="h-4 w-4" />
          {t("menuMoveTo")}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => tree.moveDocumentToTrash(documentId, t)}
        >
          <Trash2 className="h-4 w-4" />
          {t("menuMoveToTrash")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled title={t("menuComingSoon")}>
          <Grid2x2 className="h-4 w-4" />
          {t("menuTurnIntoWiki")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => tree.openDocumentInNewTab(documentId)}>
          <ExternalLink className="h-4 w-4" />
          {t("menuOpenInNewTab")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled title={t("menuComingSoon")}>
          <PanelRight className="h-4 w-4" />
          {t("menuOpenInSidePeek")}
        </DropdownMenuItem>
      </>
      );
    };
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

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup className="flex h-12 flex-col items-center justify-center p-0">
          <SidebarMenu className={state === "collapsed" ? "items-center" : undefined}>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      onClick={() => {
                        if (selectedWorkspace) router.push("/document");
                      }}
                    >
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
                          <span
                            role="button"
                            tabIndex={0}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSidebar();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleSidebar();
                              }
                            }}
                            className="ml-auto flex shrink-0 items-center justify-center"
                          >
                            <Image
                              src="/svgs/ic_double_chevron.svg"
                              alt=""
                              width={16}
                              height={16}
                              className="size-4 rotate-180 opacity-50"
                            />
                          </span>
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
          <SidebarGroupAction
            title={t("addDocument")}
            onClick={personalTree.createDocument}
            disabled={personalTree.isCreatingDocument}
          >
            <Plus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <TreeComponent
              treeData={personalTree.treeData}
              onAdd={personalTree.addChildDocument}
              onReorder={personalTree.reorderDocuments}
              renderMoreMenu={renderTreeItemMenu(personalTree)}
            />
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
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === "/dashboard"}
                    tooltip={t("home")}
                    render={<Link href="/dashboard" onClick={() => setSelectedWorkspace(null)} />}
                  >
                    <HomeIcon className="text-[#4F6DF5]" strokeWidth={2.25} />
                    <h3>{t("home")}</h3>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {selectedWorkspace && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("documentIndex")}</SidebarGroupLabel>
            <SidebarGroupAction
              title={t("addDocument")}
              onClick={teamTree.createDocument}
              disabled={teamTree.isCreatingDocument}
            >
              <Plus />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <TreeComponent
                treeData={teamTree.treeData}
                onAdd={teamTree.addChildDocument}
                onReorder={teamTree.reorderDocuments}
                renderMoreMenu={renderTreeItemMenu(teamTree)}
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
            await teamTree.refresh();
            return result;
          })
        }
      />
    </Sidebar>
  );
}
