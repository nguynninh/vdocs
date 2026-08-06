import type { MarkRange, MarkType } from "../mark/mark.types";

/** Whether [start, end) is fully covered by the union of the given ranges. */
export function isRangeMarked(ranges: MarkRange[], start: number, end: number): boolean {
  if (start >= end) return false;

  let cursor = start;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);

  for (const range of sorted) {
    if (range.start > cursor) return false;
    if (range.end > cursor) cursor = range.end;
    if (cursor >= end) return true;
  }

  return cursor >= end;
}

export function isMarkActive(marks: MarkRange[] = [], type: MarkType, start: number, end: number): boolean {
  return isRangeMarked(
    marks.filter((mark) => mark.type === type),
    start,
    end,
  );
}
