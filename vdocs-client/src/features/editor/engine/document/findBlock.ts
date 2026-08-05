import type { DocumentModel } from "./document.types";

export function findBlockIndex(document: DocumentModel, blockId: string): number {
  return document.blocks.findIndex((block) => block.id === blockId);
}
