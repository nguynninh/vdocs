export type MarkType =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "code"
  | "link"
  | "textColor"
  | "highlight";

export interface MarkData {
  /** href for "link" marks */
  href?: string;
  /** background color for "highlight" marks */
  color?: string;
}

export interface MarkRange {
  type: MarkType;
  start: number;
  end: number;
  data?: MarkData;
}
