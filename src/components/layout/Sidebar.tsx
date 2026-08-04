"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronsDownUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Clock,
  FileText,
  Home,
  Loader2,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";

import axiosClient from "@/apis/axiosClient";
import { createDocument, createSpace, getDocument, listChildren } from "@/apis/documents";
import { appInfo } from "@/constants/appInfos";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import { useAuth } from "./auth-provider";
import { paletteColorFor } from "./document-tree-icon";
import { useLocale } from "./locale-provider";
import PageTree from "./PageTree";
import { useSpaces } from "./spaces-provider";
import type { DocumentSummaryResponse } from "@/types/document";

const NAV_ITEMS = [
  { key: "home", href: "/", icon: Home },
  { key: "documents", href: "#", icon: FileText },
  { key: "favorites", href: "#", icon: Star },
  { key: "recent", href: "#", icon: Clock },
  { key: "trash", href: "#", icon: Trash2 },
] as const;

interface SidebarProps {
  variant?: "docked" | "embedded";
}

interface WorkspaceScope {
  spaceId: string;
  name: string | null;
  tree: DocumentSummaryResponse[];
}

export default function Sidebar({ variant = "docked" }: SidebarProps) {
  const { t } = useLocale();
  const { user, setUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const activeDocumentId = pathname.match(/^\/document\/([^/]+)/)?.[1] ?? null;

  const [workspaceScope, setWorkspaceScope] = useState<WorkspaceScope | null>(null);
  const workspaceName = activeDocumentId ? (workspaceScope?.name ?? appInfo.APP_NAME) : appInfo.APP_NAME;
  const displayName = user?.displayName || user?.username || "Nguyễn Ninh";
  const email = user?.email || "ninh@example.com";
  const initial = displayName.trim().charAt(0).toUpperCase() || "N";

  const [collapsed, setCollapsed] = useState(false);
  const [creatingDocument, setCreatingDocument] = useState(false);

  const { tree, loadingTree, setTree } = useSpaces();
  const [expandAll, setExpandAll] = useState({ value: false, version: 0 });
  const scopedTree = activeDocumentId ? (workspaceScope?.tree ?? []) : tree;
  const scopedLoadingTree = activeDocumentId ? !workspaceScope : loadingTree;

  const [createOpen, setCreateOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [creatingSpace, setCreatingSpace] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeDocumentId) return;

    let ignore = false;

    async function resolveSpace(documentId: string) {
      let current = await getDocument(documentId);
      while (current.parentId) {
        current = await getDocument(current.parentId);
      }
      const children = await listChildren(current.id);
      if (!ignore) {
        setWorkspaceScope((previous) =>
          previous?.spaceId === current.id
            ? previous
            : {
                spaceId: current.id,
                name: current.title || appInfo.APP_NAME,
                tree: children,
              }
        );
      }
    }

    resolveSpace(activeDocumentId)
      .catch(() => {
        if (!ignore) {
          setWorkspaceScope((previous) => previous ?? { spaceId: activeDocumentId, name: null, tree: [] });
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeDocumentId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleCreateSpace() {
    const name = newSpaceName.trim();
    if (!name) return;

    setCreatingSpace(true);
    try {
      const palette = paletteColorFor(scopedTree.length);
      const created = await createSpace(name, "folder", palette);
      setTree((prev) => [...prev, { ...created, title: name }]);
      setNewSpaceName("");
      setCreateOpen(false);
    } catch {
      // no-op: keep dialog open so the user can retry
    } finally {
      setCreatingSpace(false);
    }
  }

  async function handleNewDocument() {
    if (creatingDocument) return;
    setCreatingDocument(true);
    try {
      const document = await createDocument();
      router.push(`/document/${document.id}`);
    } finally {
      setCreatingDocument(false);
    }
  }

  async function handleLogout() {
    try {
      await axiosClient.post("/auth/logout");
    } finally {
      setUser(null);
      router.push("/");
    }
  }

  function toggleExpandAll() {
    setExpandAll((prev) => ({ value: !prev.value, version: prev.version + 1 }));
  }

  const positionClass =
    variant === "embedded" ? "sticky top-12 h-[calc(100vh-3rem)]" : "sticky top-0 h-screen";

  return (
    <aside
      className={`hidden ${positionClass} shrink-0 flex-col justify-between overflow-y-auto border-r border-neutral-200 bg-white py-3 transition-[width] duration-150 md:flex dark:border-white/10 dark:bg-neutral-900 ${
        collapsed ? "w-16 px-2" : "w-64 px-3"
      }`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-1 px-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1.5 text-left outline-none hover:bg-neutral-100 dark:hover:bg-white/5 ${
                collapsed ? "justify-center px-0" : "px-1.5"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-xs font-semibold text-white">
                {workspaceName.charAt(0)}
              </span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {workspaceName}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                </>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem>{workspaceName}</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="#" />}>{t("home.nav.settings")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label={t("home.sidebar.collapse")}
              className="shrink-0 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/5 dark:hover:text-neutral-300"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label={t("home.sidebar.expand")}
            className="mx-auto rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/5 dark:hover:text-neutral-300"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        ) : (
          <label className="flex h-8 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 text-neutral-400 focus-within:border-neutral-300 dark:border-white/10 dark:bg-white/5">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <Input
              ref={searchRef}
              type="text"
              placeholder={t("header.search")}
              className="h-auto min-w-0 flex-1 rounded-none border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
            <kbd className="rounded border border-neutral-200 px-1 text-[10px] text-neutral-400 dark:border-white/10">
              ⌘K
            </kbd>
          </label>
        )}

        <Button
          type="button"
          onClick={handleNewDocument}
          disabled={creatingDocument}
          className={`h-9 bg-indigo-50 text-indigo-600 shadow-none hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-400 dark:hover:bg-indigo-500/25 ${
            collapsed ? "w-9 justify-center px-0" : "justify-start gap-2 px-3"
          }`}
        >
          {creatingDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {!collapsed && t("home.sidebar.newDocument")}
        </Button>

        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ key, href, icon: Icon }) => {
            const active = href !== "#" && pathname === href;
            return (
              <Link
                key={key}
                href={href}
                title={collapsed ? t(`home.nav.${key}`) : undefined}
                className={`flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors ${
                  collapsed ? "justify-center px-0" : "px-3"
                } ${
                  active
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-100"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && t(`home.nav.${key}`)}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between px-3 pb-1">
              <span className="text-xs font-medium tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
                {t("home.spaces.sectionTitle")}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label={expandAll.value ? t("home.spaces.collapseAll") : t("home.spaces.expandAll")}
                  onClick={toggleExpandAll}
                  className="rounded-md p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/5 dark:hover:text-neutral-300"
                >
                  {expandAll.value ? (
                    <ChevronsDownUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label={t("home.spaces.add")}
                  onClick={() => setCreateOpen(true)}
                  className="rounded-md p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/5 dark:hover:text-neutral-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {scopedLoadingTree && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </div>
            )}

            {!scopedLoadingTree && scopedTree.length === 0 && (
              <div className="px-3 py-2 text-xs text-neutral-400 dark:text-neutral-500">
                {activeDocumentId ? t("home.spaces.emptyChildren") : t("home.spaces.empty")}
              </div>
            )}

            {!scopedLoadingTree && scopedTree.length > 0 && (
              <PageTree tree={scopedTree} expandAll={expandAll} />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 border-t border-neutral-200 pt-3 dark:border-white/10">
        <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-medium text-white">
            {initial}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {displayName}
                </div>
                <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">{email}</div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={t("home.sidebar.moreOptions")}
                  className="shrink-0 rounded-md p-1 text-neutral-400 outline-none hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/5 dark:hover:text-neutral-300"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={handleLogout} variant="destructive">
                    <LogOut />
                    {t("header.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="items-start text-left">
            <DialogTitle>{t("home.spaces.createTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={newSpaceName}
            placeholder={t("home.spaces.namePlaceholder")}
            onChange={(event) => setNewSpaceName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleCreateSpace();
            }}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              {t("home.spaces.cancel")}
            </Button>
            <Button type="button" onClick={handleCreateSpace} disabled={creatingSpace || !newSpaceName.trim()}>
              {t("home.spaces.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
