import type { MarkRange } from "../mark/mark.types";

export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletedListItem"
  | "numberedListItem"
  | "todoListItem"
  | "quote"
  | "divider"
  | "codeBlock"
  | "table";

/** Text grid for a table block — rows[r][c] is the text of that cell, and
 * cellMarks[r][c] (when present) is that same cell's inline mark ranges.
 * No CRDT merge at sub-cell granularity.
 * columnWidths[c] / rowHeights[r] are pixel sizes set via drag-resize;
 * undefined/missing entries fall back to even auto-sizing. */
export interface TableData {
  rows: string[][];
  cellMarks?: MarkRange[][][];
  columnWidths?: number[];
  rowHeights?: number[];
}

export interface BlockNode {
  id: string;
  type: BlockType;
  text: string;
  marks?: MarkRange[];
  table?: TableData;
  /** Selected language for a `codeBlock` (e.g. "java", "sql"); defaults to "plaintext". */
  codeLanguage?: string;
  /** Checked state for a `todoListItem`; defaults to false/unchecked. */
  checked?: boolean;
}
