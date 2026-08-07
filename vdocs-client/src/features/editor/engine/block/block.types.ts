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
  | "table"
  | "file";

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
  /** File embedded in a cell (via "/file" inside the cell), keyed the same as rows[r][c]. */
  cellFiles?: (FileData | null | undefined)[][];
}

/** An uploaded or linked file embedded via a `file` block. */
export interface FileData {
  id?: string;
  filename: string;
  mimeType?: string;
  size?: number;
  url: string;
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
  /** Attached file for a `file` block; undefined while still showing the upload panel. */
  file?: FileData;
}
