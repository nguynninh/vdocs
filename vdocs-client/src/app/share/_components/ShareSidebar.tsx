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
        link: `/share/${token}/${document.id}`,
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

interface ShareSidebarProps {
  rootDocumentId: string;
  rootTitle: string;
  token: string;
}

export function ShareSidebar({ rootDocumentId, rootTitle, token }: ShareSidebarProps) {
  const [documents, setDocuments] = useState<DocumentSummaryApiResponse[]>([]);

  useEffect(() => {
    let ignore = false;

    documentApi
      .listChildren(rootDocumentId, token)
      .then((response) => {
        if (!ignore) setDocuments(response.data);
      })
      .catch((error) => {
        console.error("Failed to load shared document children", error);
      });

    return () => {
      ignore = true;
    };
  }, [rootDocumentId, token]);

  if (documents.length === 0) return null;

  const treeData: TreeDataNode[] = [
    {
      key: rootDocumentId,
      title: rootTitle,
      link: `/share/${token}`,
      isLeaf: false,
      children: buildTree(documents, token, "Untitled"),
    },
  ];

  return (
    <Sidebar collapsible="none">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Mục lục</SidebarGroupLabel>
          <SidebarGroupContent>
            <TreeComponent treeData={treeData} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
