import { generateId } from "../utils/id";
import type { BlockNode, BlockType } from "./block.types";

export function createBlock(text = "", type: BlockType = "paragraph"): BlockNode {
  return { id: generateId(), type, text };
}
