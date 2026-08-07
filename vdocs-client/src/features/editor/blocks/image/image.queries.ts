import type { BlockNode, ImageAlignment } from "../../engine/block/block.types";

export function hasImage(block: BlockNode): boolean {
  return Boolean(block.image?.url);
}

export function getImageAlignment(block: BlockNode): ImageAlignment {
  return block.image?.align ?? "center";
}
