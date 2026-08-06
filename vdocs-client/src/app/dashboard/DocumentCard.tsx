"use client";

import { FileText, MoreHorizontal } from "lucide-react";
import Link from "next/link";

import type { DocumentSummaryApiResponse } from "@/src/features/editor/data/api/documentApi";

export interface DocumentCardProps {
  document: DocumentSummaryApiResponse;
  untitledLabel: string;
  updatedLabel: string;
}

export default function DocumentCard({ document, untitledLabel, updatedLabel }: DocumentCardProps) {
  return (
    <Link
      href={`/document/${document.id}`}
      className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF1FE] text-lg leading-none">
        {document.icon ? document.icon : <FileText strokeWidth={2.25} className="size-4 text-[#4F6DF5]" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{document.title || untitledLabel}</p>
        <p className="truncate text-xs text-muted-foreground">{updatedLabel}</p>
      </div>

      <button
        type="button"
        onClick={(event) => event.preventDefault()}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
        aria-label="Tùy chọn"
      >
        <MoreHorizontal className="size-4" />
      </button>
    </Link>
  );
}
