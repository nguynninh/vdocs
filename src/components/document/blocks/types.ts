export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "numbered"
  | "bulleted"
  | "code"
  | "quote"
  | "divider"
  | "todo"
  | "image"
  | "table"
  | "childPages";

export type HighlightColorId = "yellow" | "green" | "blue" | "pink" | "gray" | "code" | "link";

export interface HighlightMark {
  start: number;
  end: number;
  color?: HighlightColorId;
  href?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
  imageSrc?: string;
  table?: string[][];
  tableHeaderRow?: boolean;
  tableRowColors?: (string | null)[];
  tableColColors?: (string | null)[];
  tableColWidths?: number[];
  tableRowHeights?: number[];
  level?: number;
  marks?: HighlightMark[];
}

export const TABLE_HIGHLIGHT_COLORS: { id: string; label: string; swatch: string; cellClass: string }[] = [
  { id: "gray", label: "Gray", swatch: "bg-neutral-300", cellClass: "bg-neutral-100 dark:bg-neutral-800" },
  { id: "yellow", label: "Yellow", swatch: "bg-yellow-300", cellClass: "bg-yellow-100 dark:bg-yellow-900/40" },
  { id: "green", label: "Green", swatch: "bg-green-300", cellClass: "bg-green-100 dark:bg-green-900/40" },
  { id: "blue", label: "Blue", swatch: "bg-blue-300", cellClass: "bg-blue-100 dark:bg-blue-900/40" },
  { id: "pink", label: "Pink", swatch: "bg-pink-300", cellClass: "bg-pink-100 dark:bg-pink-900/40" },
];

export const MAX_BLOCK_INDENT_LEVEL = 8;

export const LIST_BLOCK_TYPES: BlockType[] = ["numbered", "bulleted", "todo"];

let blockIdCounter = 0;

function generateBlockId(): string {
  blockIdCounter += 1;
  return `block-${blockIdCounter}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createBlock(type: BlockType = "paragraph", text = ""): Block {
  return {
    id: generateBlockId(),
    type,
    text,
    checked: type === "todo" ? false : undefined,
  };
}
