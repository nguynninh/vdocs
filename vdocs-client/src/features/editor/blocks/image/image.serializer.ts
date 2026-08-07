import type { BlockNode } from "../../engine/block/block.types";

export function serializeImageBlockToMarkdown(block: BlockNode): string {
  if (!block.image?.url) return "";
  const alt = block.image.alt ?? block.image.caption ?? "";
  return `![${alt}](${block.image.url})`;
}
