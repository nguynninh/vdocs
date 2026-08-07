"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";

import type { ImageData } from "../../engine/block/block.types";
import { uploadAndBuildImageData } from "./image.upload";
import { ImageError } from "./ImageError";
import { ImageLoading } from "./ImageLoading";

export interface ImagePlaceholderProps {
  documentId: string;
  canEdit: boolean;
  onUploaded: (image: ImageData) => void;
}

export function ImagePlaceholder({ documentId, canEdit, onUploaded }: ImagePlaceholderProps) {
  const [tab, setTab] = useState<"upload" | "link">("upload");
  const [linkValue, setLinkValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChosen = async (file: File) => {
    setError(null);
    setIsUploading(true);
    setPercent(0);
    const { data, error: uploadError } = await uploadAndBuildImageData(documentId, file, (progress) =>
      setPercent(progress.percent),
    );
    setIsUploading(false);
    if (uploadError || !data) {
      setError(uploadError ?? "Upload failed. Please try again.");
      return;
    }
    onUploaded(data);
  };

  const handleLinkSubmit = () => {
    const url = linkValue.trim();
    if (!url) return;
    onUploaded({ url, filename: url.split("/").pop() || url, alt: "" });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    if (!canEdit) return;
    const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith("image/"));
    if (file) handleFileChosen(file);
  };

  if (isUploading) {
    return <ImageLoading percent={percent} />;
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (canEdit) setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={`rounded-md border border-dashed bg-muted/20 transition-colors ${
        isDraggingOver ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5 text-sm text-muted-foreground">
        <ImagePlus className="size-4" />
        Add an image
      </div>

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
            disabled={!canEdit}
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Upload file or drag and drop
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="url"
              value={linkValue}
              disabled={!canEdit}
              onChange={(event) => setLinkValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleLinkSubmit();
              }}
              placeholder="Paste the image link…"
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              disabled={!canEdit}
              onClick={handleLinkSubmit}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Embed image
            </button>
          </div>
        )}
        {error ? <ImageError message={error} /> : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={!canEdit}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFileChosen(file);
        }}
      />
    </div>
  );
}
