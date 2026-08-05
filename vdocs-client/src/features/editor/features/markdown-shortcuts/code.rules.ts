import type { MarkdownShortcutRule } from "./MarkdownShortcutRule";

const CODE_BLOCK_PATTERN = /^```$/;

export const codeBlockShortcutRule: MarkdownShortcutRule = (text) => {
  if (!CODE_BLOCK_PATTERN.test(text)) return null;
  return { blockType: "codeBlock", text: "" };
};
