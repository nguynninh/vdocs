import { isRangeMarked } from "../query/isMarkActive";
import type { MarkRange, MarkType } from "./mark.types";

function mergeRanges(ranges: MarkRange[]): MarkRange[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: MarkRange[] = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  return merged;
}

function subtractRange(range: MarkRange, start: number, end: number): MarkRange[] {
  if (end <= range.start || start >= range.end) return [range];

  const pieces: MarkRange[] = [];
  if (range.start < start) pieces.push({ ...range, end: start });
  if (range.end > end) pieces.push({ ...range, start: end });
  return pieces;
}

/** Toggles `type` over [start, end) — un-marks if already fully marked, otherwise marks. */
export function toggleMark(marks: MarkRange[] = [], type: MarkType, start: number, end: number): MarkRange[] {
  if (start >= end) return marks;

  const others = marks.filter((mark) => mark.type !== type);
  const sameType = marks.filter((mark) => mark.type === type);
  const alreadyActive = isRangeMarked(sameType, start, end);

  const updated = alreadyActive
    ? sameType.flatMap((range) => subtractRange(range, start, end))
    : mergeRanges([...sameType, { type, start, end }]);

  return [...others, ...updated];
}

/** Sets `type` with `data` (e.g. link href, highlight color) over [start, end), replacing any
 * existing marks of that type in the range instead of toggling — repeat calls just update data. */
export function applyMark(
  marks: MarkRange[] = [],
  type: MarkType,
  start: number,
  end: number,
  data: MarkRange["data"],
): MarkRange[] {
  if (start >= end) return marks;

  const others = marks.filter((mark) => mark.type !== type);
  const sameType = marks.filter((mark) => mark.type === type);
  const remaining = sameType.flatMap((range) => subtractRange(range, start, end));

  return [...others, ...remaining, { type, start, end, data }];
}

/** Removes all marks of `type` overlapping [start, end). */
export function removeMark(marks: MarkRange[] = [], type: MarkType, start: number, end: number): MarkRange[] {
  if (start >= end) return marks;

  const others = marks.filter((mark) => mark.type !== type);
  const sameType = marks.filter((mark) => mark.type === type);
  const remaining = sameType.flatMap((range) => subtractRange(range, start, end));

  return [...others, ...remaining];
}
