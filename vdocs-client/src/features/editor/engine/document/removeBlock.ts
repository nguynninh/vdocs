import type { DocumentModel } from "./document.types";

export function removeBlock(document: DocumentModel, blockId: string): DocumentModel {
  return { blocks: document.blocks.filter((block) => block.id !== blockId) };
}
