import { createBlock } from "../block/createBlock";
import type { DocumentModel } from "./document.types";

export function createDocument(): DocumentModel {
  return { blocks: [createBlock()] };
}
