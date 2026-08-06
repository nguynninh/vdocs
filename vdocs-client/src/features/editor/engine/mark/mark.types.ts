export type MarkType = "bold" | "code";

export interface MarkRange {
  type: MarkType;
  start: number;
  end: number;
}
