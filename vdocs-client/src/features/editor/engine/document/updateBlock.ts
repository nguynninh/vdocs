import type { DocumentModel } from "./document.types";

export function updateBlockText(document: DocumentModel, blockId: string, text: string): DocumentModel {
  return {
    ...document,
    blocks: document.blocks.map((block) => (block.id === blockId ? { ...block, text } : block)),
  };
}
