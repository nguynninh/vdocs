import type { BlockNode, BlockType } from "../block/block.types";

export type Operation =
  | { type: "insertBlockAfter"; afterId: string; block: BlockNode }
  | { type: "updateBlockText"; blockId: string; text: string }
  | { type: "removeBlock"; blockId: string }
  | { type: "mergeBlockIntoPrevious"; blockId: string }
  | { type: "convertBlockType"; blockId: string; blockType: BlockType; text?: string };
