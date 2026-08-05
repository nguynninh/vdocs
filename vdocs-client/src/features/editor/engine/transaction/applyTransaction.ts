import { findBlockIndex } from "../document/findBlock";
import { insertBlockAfter } from "../document/insertBlock";
import { removeBlock } from "../document/removeBlock";
import { setBlockType } from "../document/setBlockType";
import { updateBlockText } from "../document/updateBlock";
import type { DocumentModel } from "../document/document.types";
import type { Operation } from "../operations/operation.types";

export function applyTransaction(document: DocumentModel, operation: Operation): DocumentModel {
  switch (operation.type) {
    case "insertBlockAfter":
      return insertBlockAfter(document, operation.afterId, operation.block);
    case "updateBlockText":
      return updateBlockText(document, operation.blockId, operation.text);
    case "removeBlock":
      return removeBlock(document, operation.blockId);
    case "mergeBlockIntoPrevious": {
      const index = findBlockIndex(document, operation.blockId);
      if (index <= 0) return document;
      const previous = document.blocks[index - 1];
      const current = document.blocks[index];
      const merged = updateBlockText(document, previous.id, previous.text + current.text);
      return removeBlock(merged, current.id);
    }
    case "convertBlockType": {
      const withType = setBlockType(document, operation.blockId, operation.blockType);
      return operation.text === undefined
        ? withType
        : updateBlockText(withType, operation.blockId, operation.text);
    }
    default:
      return document;
  }
}
