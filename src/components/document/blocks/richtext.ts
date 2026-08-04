import type { HighlightColorId, HighlightMark } from "./types";

export const HIGHLIGHT_COLORS: HighlightColorId[] = ["yellow", "green", "blue", "pink", "gray"];

export const HIGHLIGHT_COLOR_VAR: Record<HighlightColorId, string> = {
  yellow: "var(--highlight-yellow)",
  green: "var(--highlight-green)",
  blue: "var(--highlight-blue)",
  pink: "var(--highlight-pink)",
  gray: "var(--highlight-gray)",
  code: "var(--inline-code-bg)",
  link: "transparent",
};

function sortMarks(marks: HighlightMark[]): HighlightMark[] {
  return [...marks].sort((a, b) => a.start - b.start);
}

function cloneAttrs(mark: HighlightMark): MarkAttrs {
  return {
    color: mark.color,
    href: mark.href,
    bold: mark.bold,
    italic: mark.italic,
    underline: mark.underline,
  };
}

export function shiftMarks(marks: HighlightMark[], delta: number): HighlightMark[] {
  return marks
    .map((mark) => ({
      ...cloneAttrs(mark),
      start: Math.max(0, mark.start + delta),
      end: Math.max(0, mark.end + delta),
    }))
    .filter((mark) => mark.end > mark.start);
}

export function clampMarks(marks: HighlightMark[], length: number): HighlightMark[] {
  return marks
    .map((mark) => ({
      ...cloneAttrs(mark),
      start: Math.max(0, mark.start),
      end: Math.min(length, mark.end),
    }))
    .filter((mark) => mark.end > mark.start);
}

/** Clips `marks` to the `[from, to)` window and rebases offsets to 0 at `from`. */
export function sliceMarks(marks: HighlightMark[], from: number, to: number): HighlightMark[] {
  const result: HighlightMark[] = [];
  for (const mark of marks) {
    const start = Math.max(mark.start, from);
    const end = Math.min(mark.end, to);
    if (end > start) {
      result.push({ ...cloneAttrs(mark), start: start - from, end: end - from });
    }
  }
  return sortMarks(result);
}

type MarkAttrs = Pick<HighlightMark, "color" | "href" | "bold" | "italic" | "underline">;

function attrsEqual(a: MarkAttrs, b: MarkAttrs): boolean {
  return (
    a.color === b.color &&
    a.href === b.href &&
    !!a.bold === !!b.bold &&
    !!a.italic === !!b.italic &&
    !!a.underline === !!b.underline
  );
}

function isEmptyAttrs(a: MarkAttrs): boolean {
  return !a.color && !a.href && !a.bold && !a.italic && !a.underline;
}

function attrsAt(marks: HighlightMark[], pos: number): MarkAttrs {
  const mark = marks.find((m) => m.start <= pos && m.end > pos);
  return mark ? cloneAttrs(mark) : {};
}

/**
 * Applies `patch` to the `[start, end)` window, leaving text outside it untouched,
 * then recompiles the mark list from the merged boundary set so adjacent runs with
 * identical attributes collapse back into a single mark.
 */
function restyle(
  marks: HighlightMark[],
  start: number,
  end: number,
  patch: Partial<MarkAttrs>
): HighlightMark[] {
  if (end <= start) return marks;
  const boundaries = new Set<number>([start, end]);
  for (const mark of marks) {
    boundaries.add(mark.start);
    boundaries.add(mark.end);
  }
  const sorted = [...boundaries].sort((a, b) => a - b);

  const result: HighlightMark[] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const segStart = sorted[i];
    const segEnd = sorted[i + 1];
    if (segEnd <= segStart) continue;
    let attrs = attrsAt(marks, segStart);
    if (segStart >= start && segEnd <= end) {
      attrs = { ...attrs, ...patch };
    }
    if (isEmptyAttrs(attrs)) continue;
    const last = result[result.length - 1];
    if (last && last.end === segStart && attrsEqual(last, attrs)) {
      last.end = segEnd;
    } else {
      result.push({ start: segStart, end: segEnd, ...attrs });
    }
  }
  return result;
}

export function applyHighlight(
  marks: HighlightMark[],
  start: number,
  end: number,
  color: HighlightColorId
): HighlightMark[] {
  if (end <= start) return marks;
  return restyle(marks, start, end, { color, href: undefined });
}

export function applyLink(
  marks: HighlightMark[],
  start: number,
  end: number,
  href: string
): HighlightMark[] {
  if (end <= start || !href.trim()) return marks;
  const normalizedHref = /^https?:\/\//i.test(href.trim()) ? href.trim() : `https://${href.trim()}`;
  return restyle(marks, start, end, { color: "link", href: normalizedHref });
}

export function clearHighlight(
  marks: HighlightMark[],
  start: number,
  end: number
): HighlightMark[] {
  if (end <= start) return marks;
  return restyle(marks, start, end, { color: undefined, href: undefined });
}

export type TextStyleKey = "bold" | "italic" | "underline";

/** Toggles a bold/italic/underline style over `[start, end)`, independent of color/link. */
export function toggleTextStyle(
  marks: HighlightMark[],
  start: number,
  end: number,
  style: TextStyleKey
): HighlightMark[] {
  if (end <= start) return marks;
  const boundaries = new Set<number>([start, end]);
  for (const mark of marks) {
    boundaries.add(mark.start);
    boundaries.add(mark.end);
  }
  const sorted = [...boundaries].sort((a, b) => a - b).filter((n) => n >= start && n <= end);

  let allActive = true;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const segStart = sorted[i];
    const segEnd = sorted[i + 1];
    if (segEnd <= segStart) continue;
    if (!attrsAt(marks, segStart)[style]) {
      allActive = false;
      break;
    }
  }

  return restyle(marks, start, end, { [style]: allActive ? undefined : true });
}

/** Splits marks around a block-split point (e.g. pressing Enter mid-text). */
export function splitMarksAt(
  marks: HighlightMark[],
  at: number
): { before: HighlightMark[]; after: HighlightMark[] } {
  return { before: sliceMarks(marks, 0, at), after: sliceMarks(marks, at, Infinity) };
}

/** Concatenates two blocks' marks (e.g. Backspace-merge), `b` appearing after `aLen` chars of `a`. */
export function mergeMarksForConcat(
  a: HighlightMark[],
  aLen: number,
  b: HighlightMark[]
): HighlightMark[] {
  return sortMarks([...a, ...shiftMarks(b, aLen)]);
}

/**
 * Remaps marks after a plain-typing edit by diffing old/new text. `caretAfterEdit`
 * (free from `textarea.selectionStart` post-change) disambiguates edits inside a
 * run of repeated characters, where the naive common-prefix scan can overshoot the
 * true edit point. Only applied for pure growth (typing/paste/IME commit), since for
 * that case insertedCount equals the exact length delta; shrink/replace edits fall
 * back to the plain diff, which is exact whenever surrounding characters are unique.
 */
export function remapMarksOnEdit(
  oldText: string,
  newText: string,
  marks: HighlightMark[],
  caretAfterEdit?: number
): HighlightMark[] {
  if (!marks.length) return marks;
  if (oldText === newText) return marks;

  const maxPrefix = Math.min(oldText.length, newText.length);
  let prefix = 0;
  while (prefix < maxPrefix && oldText[prefix] === newText[prefix]) prefix += 1;

  if (caretAfterEdit !== undefined && newText.length > oldText.length) {
    const insertedCount = newText.length - oldText.length;
    prefix = Math.min(prefix, Math.max(0, caretAfterEdit - insertedCount));
  }

  const maxSuffix = maxPrefix - prefix;
  let suffix = 0;
  while (
    suffix < maxSuffix &&
    oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const removedEnd = oldText.length - suffix;
  const insertedEnd = newText.length - suffix;
  const delta = insertedEnd - removedEnd;

  const result: HighlightMark[] = [];
  for (const mark of marks) {
    if (mark.end <= prefix) {
      result.push(mark);
      continue;
    }
    if (mark.start >= removedEnd) {
      result.push({ ...cloneAttrs(mark), start: mark.start + delta, end: mark.end + delta });
      continue;
    }
    const touchesLeft = mark.start <= prefix;
    const touchesRight = mark.end >= removedEnd;
    if (touchesLeft && touchesRight) {
      result.push({ ...cloneAttrs(mark), start: mark.start, end: mark.end + delta });
    } else if (touchesLeft) {
      result.push({ ...cloneAttrs(mark), start: mark.start, end: prefix });
    } else if (touchesRight) {
      result.push({ ...cloneAttrs(mark), start: insertedEnd, end: mark.end + delta });
    }
    // Otherwise the mark was fully inside the edited region — drop it.
  }
  return clampMarks(sortMarks(result), newText.length);
}

export interface TextSegment {
  text: string;
  start: number;
  end: number;
  color?: HighlightColorId;
  href?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  isSelection?: boolean;
}

/** Splits `text` at every mark boundary and (optionally) the active selection's edges. */
export function buildSegments(
  text: string,
  marks: HighlightMark[] = [],
  selection?: { start: number; end: number } | null
): TextSegment[] {
  const clip = (n: number) => Math.max(0, Math.min(text.length, n));
  const boundaries = new Set<number>([0, text.length]);
  for (const mark of marks) {
    boundaries.add(clip(mark.start));
    boundaries.add(clip(mark.end));
  }
  const hasSelection = !!selection && selection.end > selection.start;
  if (hasSelection && selection) {
    boundaries.add(clip(selection.start));
    boundaries.add(clip(selection.end));
  }
  const sorted = [...boundaries].sort((a, b) => a - b);

  const segments: TextSegment[] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (end <= start) continue;
    const mark = marks.find((m) => m.start <= start && m.end >= end);
    const isSelection =
      hasSelection && !!selection && selection.start <= start && selection.end >= end;
    segments.push({
      text: text.slice(start, end),
      start,
      end,
      color: mark?.color,
      href: mark?.href,
      bold: mark?.bold,
      italic: mark?.italic,
      underline: mark?.underline,
      isSelection,
    });
  }
  if (segments.length === 0) segments.push({ text: "", start: 0, end: 0 });
  return segments;
}
