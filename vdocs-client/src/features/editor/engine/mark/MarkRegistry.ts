import type { MarkType } from "./mark.types";

export interface MarkDefinition {
  type: MarkType;
  hotkey: string;
  tag: "strong" | "code";
}

export const MARK_REGISTRY: Record<MarkType, MarkDefinition> = {
  bold: { type: "bold", hotkey: "b", tag: "strong" },
  code: { type: "code", hotkey: "e", tag: "code" },
};
