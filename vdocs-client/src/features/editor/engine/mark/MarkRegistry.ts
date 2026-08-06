import type { MarkType } from "./mark.types";

export interface MarkDefinition {
  type: MarkType;
  hotkey: string;
  tag: "strong";
}

export const MARK_REGISTRY: Record<MarkType, MarkDefinition> = {
  bold: { type: "bold", hotkey: "b", tag: "strong" },
};
