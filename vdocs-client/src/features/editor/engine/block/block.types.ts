export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletedListItem"
  | "numberedListItem"
  | "quote"
  | "divider"
  | "codeBlock"
  | "table";

/** Plain-text grid for a table block — rows[r][c] is the text of that cell.
 * No rich formatting inside cells, no CRDT merge at sub-cell granularity.
 * columnWidths[c] / rowHeights[r] are pixel sizes set via drag-resize;
 * undefined/missing entries fall back to even auto-sizing. */
export interface TableData {
  rows: string[][];
  columnWidths?: number[];
  rowHeights?: number[];
}

export interface BlockNode {
  id: string;
  type: BlockType;
  text: string;
  table?: TableData;
}
