import type { MarkType } from "./mark.types";

export interface MarkDefinition {
  type: MarkType;
  hotkey: string;
  tag: "strong" | "em" | "u" | "s" | "code" | "a" | "mark";
}

export const MARK_REGISTRY: Record<MarkType, MarkDefinition> = {
  bold: { type: "bold", hotkey: "b", tag: "strong" },
  italic: { type: "italic", hotkey: "i", tag: "em" },
  underline: { type: "underline", hotkey: "u", tag: "u" },
  strikethrough: { type: "strikethrough", hotkey: "d", tag: "s" },
  code: { type: "code", hotkey: "e", tag: "code" },
  link: { type: "link", hotkey: "k", tag: "a" },
  highlight: { type: "highlight", hotkey: "h", tag: "mark" },
};
