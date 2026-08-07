"use client";

import { useState } from "react";

import type { ImageAlignment, ImageData } from "../../engine/block/block.types";
import { clampImageWidth } from "./image.resize";
import { ImageCaption } from "./ImageCaption";
import { ImageResizeHandle } from "./ImageResizeHandle";
import { ImageToolbar } from "./ImageToolbar";
import { ImageView } from "./ImageView";

export interface ImageEditorProps {
  image: ImageData;
  canEdit: boolean;
  onChange: (image: ImageData) => void;
  onReplace: () => void;
}

export function ImageEditor({ image, canEdit, onChange, onReplace }: ImageEditorProps) {
  const [width, setWidth] = useState(image.width ?? 480);

  const handleAlignChange = (align: ImageAlignment) => onChange({ ...image, align });
  const handleCaptionChange = (caption: string) => onChange({ ...image, caption });
  const handleResize = (nextWidth: number) => {
    const clamped = clampImageWidth(nextWidth);
    setWidth(clamped);
    onChange({ ...image, width: clamped });
  };

  return (
    <div className="group relative">
      <div className="relative inline-block max-w-full">
        <ImageView image={{ ...image, width }} />
        {canEdit && image.align !== "full" ? (
          <>
            <ImageResizeHandle side="left" currentWidth={width} onResize={handleResize} />
            <ImageResizeHandle side="right" currentWidth={width} onResize={handleResize} />
          </>
        ) : null}
        {canEdit ? (
          <ImageToolbar
            align={image.align ?? "center"}
            onAlignChange={handleAlignChange}
            onReplace={onReplace}
          />
        ) : null}
      </div>
      <ImageCaption caption={image.caption} canEdit={canEdit} onChange={handleCaptionChange} />
    </div>
  );
}
