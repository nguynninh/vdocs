import type { BlockType } from "../block/block.types";
import type { DocumentModel } from "./document.types";

export function setBlockType(
  document: DocumentModel,
  blockId: string,
  blockType: BlockType,
): DocumentModel {
  return {
    ...document,
    blocks: document.blocks.map((block) => (block.id === blockId ? { ...block, type: blockType } : block)),
  };
}
