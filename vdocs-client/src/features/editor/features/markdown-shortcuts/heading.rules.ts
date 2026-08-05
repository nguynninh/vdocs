import type { MarkdownShortcutRule } from "./MarkdownShortcutRule";

const HEADING_PATTERN = /^(#{1,3})\s(.*)$/;
const HEADING_BLOCK_TYPES = ["heading1", "heading2", "heading3"] as const;

export const headingShortcutRule: MarkdownShortcutRule = (text) => {
  const match = HEADING_PATTERN.exec(text);
  if (!match) return null;

  const level = match[1].length;
  return { blockType: HEADING_BLOCK_TYPES[level - 1], text: match[2] };
};
