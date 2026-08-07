"use client";

import { Download, File as FileIcon, Paperclip } from "lucide-react";
import { useRef, useState } from "react";

import { resolveFileUrl } from "../../data/api/documentApi";
import { documentApi } from "../../data/api/documentApi";
import type { BlockNode } from "../../engine/block/block.types";
import { useEditor } from "../../react/EditorProvider";

export interface FileBlockProps {
  block: BlockNode;
  isFirst: boolean;
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileBlock({ block }: FileBlockProps) {
  const { documentId, setBlockFileData, canEdit } = useEditor();
  const [tab, setTab] = useState<"upload" | "link">("upload");
  const [linkValue, setLinkValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (block.file) {
    return (
      <a
        href={resolveFileUrl(block.file.url)}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5 hover:bg-muted/70"
      >
        <FileIcon className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{block.file.filename}</div>
          {block.file.size ? (
            <div className="text-xs text-muted-foreground">{formatSize(block.file.size)}</div>
          ) : null}
        </div>
        <Download className="size-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </a>
    );
  }

  const handleFileChosen = async (file: File) => {
    setError(null);
    setIsUploading(true);
    try {
      const { data } = await documentApi.uploadFile(documentId, file);
      setBlockFileData(block.id, {
        id: data.id,
        filename: data.filename,
        mimeType: data.mimeType,
        size: data.size,
        url: data.url,
      });
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLinkSubmit = () => {
    const url = linkValue.trim();
    if (!url) return;
    setBlockFileData(block.id, {
      filename: url.split("/").pop() || url,
      url,
    });
  };

  return (
    <div className="rounded-md border border-border bg-muted/20">
      <label className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2.5 text-sm text-muted-foreground">
        <Paperclip className="size-4" />
        Upload or embed a file
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          disabled={!canEdit || isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFileChosen(file);
          }}
        />
      </label>

      <div className="flex items-center gap-1 px-3 pt-2">
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`rounded px-2 py-1 text-xs font-medium ${
            tab === "upload" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          }`}
        >
          Upload
        </button>
        <button
          type="button"
          onClick={() => setTab("link")}
          className={`rounded px-2 py-1 text-xs font-medium ${
            tab === "link" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          }`}
        >
          Link
        </button>
      </div>

      <div className="px-3 pb-3 pt-2">
        {tab === "upload" ? (
          <button
            type="button"
            disabled={!canEdit || isUploading}
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {isUploading ? "Uploading…" : "Choose a file"}
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="url"
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleLinkSubmit();
              }}
              placeholder="Paste a file link…"
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={handleLinkSubmit}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Embed
            </button>
          </div>
        )}
        {error ? <div className="mt-2 text-xs text-destructive">{error}</div> : null}
      </div>
    </div>
  );
}
