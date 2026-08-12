"use client";

import { useEffect, useState } from "react";
import {
  documentApi,
  type DocumentSummaryApiResponse,
} from "@/src/features/editor/data/api/documentApi";
import TreeComponent, { type TreeDataNode } from "@/src/app/components/tree/TreeComponent";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

function buildTree(
  documents: DocumentSummaryApiResponse[],
  token: string,
  untitledLabel: string
): TreeDataNode[] {
  const nodeById = new Map<string, TreeDataNode>(
    documents.map((document) => [
      document.id,
      {
        key: document.id,
        title: document.title || untitledLabel,
        link: `/share/workspace/${token}/${document.id}`,
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

interface WorkspaceShareSidebarProps {
  workspaceName: string;
  token: string;
}

export function WorkspaceShareSidebar({ workspaceName, token }: WorkspaceShareSidebarProps) {
  const [documents, setDocuments] = useState<DocumentSummaryApiResponse[]>([]);

  useEffect(() => {
    let ignore = false;

    documentApi
      .listByWorkspaceShareToken(token)
      .then((response) => {
        if (!ignore) setDocuments(response.data);
      })
      .catch((error) => {
        console.error("Failed to load shared workspace documents", error);
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  const treeData = buildTree(documents, token, "Untitled");

  return (
    <Sidebar collapsible="none">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{workspaceName}</SidebarGroupLabel>
          <SidebarGroupContent>
            <TreeComponent treeData={treeData} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
