import type { MarkdownShortcutRule } from "./MarkdownShortcutRule";

const QUOTE_PATTERN = /^>\s(.*)$/;

export const quoteShortcutRule: MarkdownShortcutRule = (text) => {
  const match = QUOTE_PATTERN.exec(text);
  if (!match) return null;
  return { blockType: "quote", text: match[1] };
};
