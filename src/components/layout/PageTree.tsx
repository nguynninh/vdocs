"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Tree } from "antd";
import type { TreeDataNode, TreeProps } from "antd";
import { Loader2, Plus } from "lucide-react";

import { createPage, listChildren, moveDocument } from "@/apis/documents";
import type { DocumentSummaryResponse } from "@/types/document";

import DocumentTreeIcon from "./document-tree-icon";
import { useLocale } from "./locale-provider";

interface DocumentTreeNode extends TreeDataNode {
  key: string;
  document: DocumentSummaryResponse;
  documentIndex: number;
  children?: DocumentTreeNode[];
}

interface PageTreeProps {
  tree: DocumentSummaryResponse[];
  expandAll: { value: boolean; version: number };
}

export default function PageTree({ tree, expandAll }: PageTreeProps) {
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  // Flat map of parentId -> already-loaded children, populated lazily on
  // expand/add/drop. The tree itself is derived from `tree` + this map so we
  // never need to mirror props into state.
  const [childrenMap, setChildrenMap] = useState<Record<string, DocumentSummaryResponse[]>>({});
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // Adjust expanded keys during render when the parent's expand-all toggle
  // changes, instead of mirroring it via an effect.
  const [syncedExpandVersion, setSyncedExpandVersion] = useState(expandAll.version);
  if (syncedExpandVersion !== expandAll.version) {
    setSyncedExpandVersion(expandAll.version);
    setExpandedKeys(expandAll.value ? tree.map((item) => item.id) : []);
  }

  function findDocument(key: string): DocumentSummaryResponse | null {
    for (const list of Object.values(childrenMap)) {
      const found = list.find((document) => document.id === key);
      if (found) return found;
    }
    return null;
  }

  function findParentKey(key: string): string | null {
    for (const [parentId, list] of Object.entries(childrenMap)) {
      if (list.some((document) => document.id === key)) return parentId;
    }
    return null;
  }

  function buildNode(document: DocumentSummaryResponse, index: number): DocumentTreeNode {
    const children = childrenMap[document.id];
    return {
      key: document.id,
      document,
      documentIndex: index,
      isLeaf: children ? children.length === 0 : undefined,
      children: children?.map((child, childIndex) => buildNode(child, childIndex)),
    };
  }

  const treeData = useMemo(
    () => tree.map((document, index) => buildNode(document, index)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tree, childrenMap]
  );

  async function ensureChildrenLoaded(key: string) {
    setLoadingKeys((prev) => new Set(prev).add(key));
    try {
      const children = await listChildren(key);
      setChildrenMap((prev) => ({ ...prev, [key]: children }));
    } catch {
      setChildrenMap((prev) => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleAddPage(parentKey: string) {
    try {
      const page = await createPage(parentKey);
      setChildrenMap((prev) => ({ ...prev, [parentKey]: [...(prev[parentKey] ?? []), page] }));
      setExpandedKeys((prev) => (prev.includes(parentKey) ? prev : [...prev, parentKey]));
      router.push(`/document/${page.id}`);
    } catch {
      // no-op: keep tree state as-is so the user can retry
    }
  }

  const onLoadData: TreeProps["loadData"] = (node) => ensureChildrenLoaded(String(node.key));

  const onExpand: TreeProps["onExpand"] = (keys) => setExpandedKeys(keys.map(String));

  const onDrop: TreeProps["onDrop"] = async (info) => {
    const dragKey = String(info.dragNode.key);
    const dropKey = String(info.node.key);
    if (info.dropToGap || info.dropPosition !== 0 || dragKey === dropKey) return;

    const dragged = findDocument(dragKey);
    if (!dragged) return;

    try {
      await moveDocument(dragKey, dropKey);
    } catch {
      return;
    }

    const oldParentKey = findParentKey(dragKey);
    setChildrenMap((prev) => {
      const next = { ...prev };
      if (oldParentKey) next[oldParentKey] = next[oldParentKey].filter((document) => document.id !== dragKey);
      next[dropKey] = [...(next[dropKey] ?? []), dragged];
      return next;
    });
    setExpandedKeys((prev) => (prev.includes(dropKey) ? prev : [...prev, dropKey]));
  };

  function titleRender(node: DocumentTreeNode) {
    const { document, documentIndex } = node;
    const active = pathname === `/document/${document.id}`;
    const isLoading = loadingKeys.has(document.id);

    return (
      <div
        className={`group/tree-item flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-1 py-0.5 text-sm font-medium ${
          active
            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-100"
        }`}
      >
        <DocumentTreeIcon document={document} index={documentIndex} className="h-3.5 w-3.5" />
        <Link href={`/document/${document.id}`} className="min-w-0 flex-1 truncate">
          {document.title || t("home.spaces.untitled")}
        </Link>
        {isLoading ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-neutral-400" />
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleAddPage(document.id);
            }}
            aria-label={t("home.spaces.addPage")}
            className="hidden shrink-0 rounded p-0.5 hover:bg-neutral-200 group-hover/tree-item:block dark:hover:bg-white/10"
          >
            <Plus className="h-3 w-3 text-neutral-400" />
          </button>
        )}
      </div>
    );
  }

  return (
    <Tree<DocumentTreeNode>
      treeData={treeData}
      loadData={onLoadData}
      expandedKeys={expandedKeys}
      onExpand={onExpand}
      selectable={false}
      blockNode
      showIcon={false}
      draggable={{ nodeDraggable: (node) => (node as DocumentTreeNode).document.type !== "SPACE" }}
      allowDrop={({ dropPosition }) => dropPosition === 0}
      onDrop={onDrop}
      titleRender={titleRender}
      className="page-tree -mx-1"
    />
  );
}
