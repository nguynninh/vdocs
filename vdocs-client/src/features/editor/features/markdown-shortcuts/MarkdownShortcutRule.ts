import type { BlockType } from "../../engine/block/block.types";

export interface MarkdownShortcutMatch {
  blockType: BlockType;
  text: string;
  /** Only meaningful for `todoListItem` — whether it starts checked. */
  checked?: boolean;
}

export type MarkdownShortcutRule = (text: string) => MarkdownShortcutMatch | null;
