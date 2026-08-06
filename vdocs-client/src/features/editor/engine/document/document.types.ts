import type { BlockNode } from "../block/block.types";

export type FontStyle = "default" | "serif" | "mono";

export interface DocumentModel {
  blocks: BlockNode[];
  fullWidth: boolean;
  fontStyle: FontStyle;
  smallText: boolean;
}
