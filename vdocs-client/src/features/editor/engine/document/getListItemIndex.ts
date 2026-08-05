import type { DocumentModel } from "./document.types";
import { findBlockIndex } from "./findBlock";

export function getNumberedListIndex(document: DocumentModel, blockId: string): number {
  const index = findBlockIndex(document, blockId);
  if (index === -1) return 1;

  let count = 1;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (document.blocks[i].type !== "numberedListItem") break;
    count += 1;
  }
  return count;
}
