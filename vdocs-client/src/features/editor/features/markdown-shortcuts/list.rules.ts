import type { MarkdownShortcutRule } from "./MarkdownShortcutRule";

const BULLET_PATTERN = /^[-*]\s(.*)$/;
const NUMBERED_PATTERN = /^\d+\.\s(.*)$/;

export const bulletedListShortcutRule: MarkdownShortcutRule = (text) => {
  const match = BULLET_PATTERN.exec(text);
  if (!match) return null;
  return { blockType: "bulletedListItem", text: match[1] };
};

export const numberedListShortcutRule: MarkdownShortcutRule = (text) => {
  const match = NUMBERED_PATTERN.exec(text);
  if (!match) return null;
  return { blockType: "numberedListItem", text: match[1] };
};
