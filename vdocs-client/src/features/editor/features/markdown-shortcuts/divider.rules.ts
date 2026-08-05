import type { MarkdownShortcutRule } from "./MarkdownShortcutRule";

const DIVIDER_PATTERN = /^-{3,}$/;

export const dividerShortcutRule: MarkdownShortcutRule = (text) => {
  if (!DIVIDER_PATTERN.test(text)) return null;
  return { blockType: "divider", text: "" };
};
