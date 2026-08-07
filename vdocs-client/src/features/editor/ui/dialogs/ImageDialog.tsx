"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";

import type { ImageData } from "../../engine/block/block.types";
import { uploadAndBuildImageData } from "../../blocks/image/image.upload";
import { ImageError } from "../../blocks/image/ImageError";
import { ImageLoading } from "../../blocks/image/ImageLoading";

export interface ImageDialogProps {
  documentId: string;
  onSelect: (image: ImageData) => void;
  onClose: () => void;
}

export function ImageDialog({ documentId, onSelect, onClose }: ImageDialogProps) {
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
    onSelect(data);
  };

  const handleLinkSubmit = () => {
    const url = linkValue.trim();
    if (!url) return;
    onSelect({ url, filename: url.split("/").pop() || url, alt: "" });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith("image/"));
    if (file) handleFileChosen(file);
  };

  return (
    <div
      className="absolute left-0 top-full z-30 mt-1 w-80 rounded-lg border border-border bg-popover p-3 shadow-lg"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ImagePlus className="size-4" />
          Add an image
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted">
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-border pb-2">
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

      <div className="pt-2">
        {isUploading ? (
          <ImageLoading percent={percent} />
        ) : tab === "upload" ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center gap-2 rounded-md border border-dashed px-3 py-6 text-center transition-colors ${
              isDraggingOver ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <p className="text-xs text-muted-foreground">Drag and drop an image, or</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Upload file
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="url"
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleLinkSubmit();
              }}
              placeholder="Paste the image link…"
              autoFocus
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={handleLinkSubmit}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
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
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFileChosen(file);
        }}
      />
    </div>
  );
}
