import type { MarkdownShortcutRule } from "./MarkdownShortcutRule";

const BULLET_PATTERN = /^[-*]\s(.*)$/;
const NUMBERED_PATTERN = /^\d+\.\s(.*)$/;
const TODO_PATTERN = /^(?:[-*]\s)?\[( |x|X)?\]\s(.*)$/;

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

// Typing "[] ", "[ ] ", or "[x] " at the start of a line converts to a
// checkbox — "[x]"/"[X]" starts it already checked.
export const todoListShortcutRule: MarkdownShortcutRule = (text) => {
  const match = TODO_PATTERN.exec(text);
  if (!match) return null;
  const checked = match[1] === "x" || match[1] === "X";
  return { blockType: "todoListItem", text: match[2], checked };
};
