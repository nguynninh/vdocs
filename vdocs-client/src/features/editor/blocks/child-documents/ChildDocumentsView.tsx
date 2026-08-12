"use client";

import { ChevronDown, FileText } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { useLocale } from "@/src/i18n/hooks/useLocale";
import { documentApi, type DocumentSummaryApiResponse } from "../../data/api/documentApi";
import type { BlockNode } from "../../engine/block/block.types";
import { PageIconGlyph } from "../../ui/icon-picker/PageIconGlyph";
import type { PageIcon } from "../../ui/icon-picker/PageIcon";
import { useEditor } from "../../react/EditorProvider";

export interface ChildDocumentsViewProps {
  block: BlockNode;
}

function parseIcon(raw: string | null): PageIcon | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PageIcon;
  } catch {
    return null;
  }
}

function childHref(id: string, shareToken?: string, workspaceShareToken?: string) {
  if (workspaceShareToken) return `/share/workspace/${workspaceShareToken}/${id}`;
  if (shareToken) return `/share/${shareToken}/${id}`;
  return `/document/${id}`;
}

function getDescendants(documents: DocumentSummaryApiResponse[], parentId: string) {
  const childrenByParentId = new Map<string, DocumentSummaryApiResponse[]>();

  for (const document of documents) {
    if (!document.parentId) continue;
    childrenByParentId.set(document.parentId, [
      ...(childrenByParentId.get(document.parentId) ?? []),
      document,
    ]);
  }

  const descendants: DocumentSummaryApiResponse[] = [];
  const queue = [parentId];

  while (queue.length) {
    const id = queue.shift() as string;
    const children = childrenByParentId.get(id) ?? [];
    descendants.push(...children);
    queue.push(...children.map((child) => child.id));
  }

  return descendants;
}

export function ChildDocumentsView({ block }: ChildDocumentsViewProps) {
  const t = useTranslations("editorContent");
  const { locale } = useLocale();
  const { documentId, shareToken, workspaceShareToken } = useEditor();
  const [documents, setDocuments] = useState<DocumentSummaryApiResponse[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let ignore = false;

    const request = workspaceShareToken
      ? documentApi
          .listByWorkspaceShareToken(workspaceShareToken)
          .then((response) => ({ ...response, data: getDescendants(response.data, documentId) }))
      : documentApi.listChildren(documentId, shareToken);

    request
      .then((response) => {
        if (ignore) return;
        setDocuments(response.data);
        setStatus("ready");
      })
      .catch((error) => {
        console.error("Failed to load child documents", error);
        if (!ignore) setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, [documentId, shareToken, workspaceShareToken, block.id]);

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="my-2 overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse border border-[#dfe3e8] text-sm">
        <thead>
          <tr className="h-8 border-b border-[#dfe3e8] text-left font-normal text-muted-foreground">
            <th className="w-[54%] px-6 font-normal">
              <span className="inline-flex items-center gap-1">
                {t("childDocumentsName")} <ChevronDown className="size-3" />
              </span>
            </th>
            <th className="w-[20%] px-3 font-normal">{t("childDocumentsOwner")}</th>
            <th className="w-[26%] px-3 font-normal">
              <span className="inline-flex items-center gap-1">
                {t("childDocumentsUpdated")} <ChevronDown className="size-3" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {status !== "ready" && (
            <tr>
              <td className="px-6 py-4 text-muted-foreground" colSpan={3}>
                {status === "loading" ? t("childDocumentsLoading") : t("childDocumentsError")}
              </td>
            </tr>
          )}
          {status === "ready" && documents.length === 0 && (
            <tr>
              <td className="px-6 py-4 text-muted-foreground" colSpan={3}>
                {t("childDocumentsEmpty")}
              </td>
            </tr>
          )}
          {status === "ready" &&
            documents.map((document) => {
              const icon = parseIcon(document.icon);

              return (
                <tr key={document.id} className="h-8 hover:bg-muted/50">
                  <td className="px-6">
                    <Link
                      href={childHref(document.id, shareToken, workspaceShareToken)}
                      className="flex min-w-0 items-center gap-2 text-foreground"
                    >
                      {icon ? (
                        <PageIconGlyph
                          icon={icon}
                          emojiClassName="text-sm leading-none"
                          iconClassName="size-4"
                          imageClassName="size-4 rounded object-cover"
                        />
                      ) : (
                        <FileText className="size-4 shrink-0 text-[#3f78e0]" />
                      )}
                      <span className={cn("truncate", !document.title && "text-muted-foreground")}>
                        {document.title || t("childDocumentsUntitled")}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 text-muted-foreground">{document.owner?.name ?? t("childDocumentsUnknownOwner")}</td>
                  <td className="px-3 text-muted-foreground">{dateFormatter.format(new Date(document.updatedAt))}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
