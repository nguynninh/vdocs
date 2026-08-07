"use client";

import { RefreshCw } from "lucide-react";

import type { ImageAlignment } from "../../engine/block/block.types";
import { ImageAlignmentMenu } from "./ImageAlignmentMenu";

export interface ImageToolbarProps {
  align: ImageAlignment;
  onAlignChange: (align: ImageAlignment) => void;
  onReplace: () => void;
}

export function ImageToolbar({ align, onAlignChange, onReplace }: ImageToolbarProps) {
  return (
    <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <ImageAlignmentMenu align={align} onChange={onAlignChange} />
      <button
        type="button"
        title="Replace image"
        onClick={onReplace}
        className="rounded-md border border-border bg-popover p-1.5 text-muted-foreground shadow-sm hover:bg-muted"
      >
        <RefreshCw className="size-3.5" />
      </button>
    </div>
  );
}
