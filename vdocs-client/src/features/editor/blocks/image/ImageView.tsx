"use client";

import type { ImageData } from "../../engine/block/block.types";
import { resolveFileUrl } from "../../data/api/documentApi";

export interface ImageViewProps {
  image: ImageData;
}

const ALIGN_CLASS: Record<string, string> = {
  left: "mr-auto",
  center: "mx-auto",
  full: "mx-auto w-full",
};

export function ImageView({ image }: ImageViewProps) {
  return (
    <img
      src={resolveFileUrl(image.url)}
      alt={image.alt ?? ""}
      draggable={false}
      style={image.align === "full" ? undefined : { width: image.width ? `${image.width}px` : undefined }}
      className={`block max-w-full rounded-md object-contain ${ALIGN_CLASS[image.align ?? "center"]}`}
    />
  );
}
