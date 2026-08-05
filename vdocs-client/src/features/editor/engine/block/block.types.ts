export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletedListItem"
  | "numberedListItem"
  | "quote"
  | "divider"
  | "codeBlock";

export interface BlockNode {
  id: string;
  type: BlockType;
  text: string;
}
