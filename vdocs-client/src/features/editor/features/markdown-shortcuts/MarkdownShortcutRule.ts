import type { BlockType } from "../../engine/block/block.types";

export interface MarkdownShortcutMatch {
  blockType: BlockType;
  text: string;
}

export type MarkdownShortcutRule = (text: string) => MarkdownShortcutMatch | null;
