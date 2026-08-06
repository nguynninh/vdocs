import type { MarkRange } from "./mark.types";

function shiftForInsert(position: number, offset: number, length: number): number {
  return position >= offset ? position + length : position;
}

function shiftForDelete(position: number, offset: number, length: number): number {
  const deleteEnd = offset + length;
  if (position <= offset) return position;
  if (position >= deleteEnd) return position - length;
  return offset;
}

/** Keeps mark ranges aligned with the text after an insert at `offset`. */
export function shiftMarksForInsert(marks: MarkRange[], offset: number, length: number): MarkRange[] {
  if (length === 0) return marks;
  return marks.map((mark) => ({
    ...mark,
    start: shiftForInsert(mark.start, offset, length),
    end: shiftForInsert(mark.end, offset, length),
  }));
}

/** Keeps mark ranges aligned with the text after a delete at `offset`, dropping ranges collapsed to zero length. */
export function shiftMarksForDelete(marks: MarkRange[], offset: number, length: number): MarkRange[] {
  if (length === 0) return marks;
  return marks
    .map((mark) => ({
      ...mark,
      start: shiftForDelete(mark.start, offset, length),
      end: shiftForDelete(mark.end, offset, length),
    }))
    .filter((mark) => mark.end > mark.start);
}
