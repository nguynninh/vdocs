"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus } from "lucide-react";

import { createPage, listChildren } from "@/apis/documents";
import { useLocale } from "@/components/layout/locale-provider";
import { formatRelativeTimeShort } from "@/lib/time";
import type { DocumentSummaryResponse } from "@/types/document";

interface ChildPagesBlockProps {
  documentId: string;
}

export default function ChildPagesBlock({ documentId }: ChildPagesBlockProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [children, setChildren] = React.useState<DocumentSummaryResponse[] | null>(null);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    let ignore = false;
    listChildren(documentId)
      .then((docs) => {
        if (!ignore) setChildren(docs);
      })
      .catch(() => {
        if (!ignore) setChildren([]);
      });
    return () => {
      ignore = true;
    };
  }, [documentId]);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const page = await createPage(documentId);
      router.push(`/document/${page.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="w-full overflow-hidden rounded-none border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          {t("document.body.childPages.title")}
        </span>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-1 rounded-none px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <Plus className="size-3.5" />
          {t("document.body.childPages.new")}
        </button>
      </div>

      {children === null ? (
        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
          {t("document.body.childPages.loading")}
        </div>
      ) : children.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
          {t("document.body.childPages.empty")}
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="px-3 py-1.5 font-medium">{t("document.body.childPages.columns.name")}</th>
              <th className="px-3 py-1.5 font-medium">{t("document.body.childPages.columns.owner")}</th>
              <th className="px-3 py-1.5 font-medium">
                {t("document.body.childPages.columns.modified")}
              </th>
            </tr>
          </thead>
          <tbody>
            {children.map((doc) => (
              <tr
                key={doc.id}
                onClick={() => router.push(`/document/${doc.id}`)}
                className="cursor-pointer border-t border-border hover:bg-muted/60"
              >
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <FileText className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span className="truncate">{doc.title || t("document.untitled")}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {doc.updatedBy || t("document.activity.unknown")}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatRelativeTimeShort(doc.updatedAt, t, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
