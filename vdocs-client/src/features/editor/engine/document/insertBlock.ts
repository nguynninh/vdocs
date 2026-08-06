import type { BlockNode } from "../block/block.types";
import type { DocumentModel } from "./document.types";
import { findBlockIndex } from "./findBlock";

export function insertBlockAfter(
  document: DocumentModel,
  afterId: string,
  block: BlockNode,
): DocumentModel {
  const index = findBlockIndex(document, afterId);
  const blocks = [...document.blocks];
  blocks.splice(index + 1, 0, block);
  return { ...document, blocks };
}
