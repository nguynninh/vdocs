import { MARK_REGISTRY } from "../../engine/mark/MarkRegistry";
import type { MarkRange } from "../../engine/mark/mark.types";

/** Rebuilds `node`'s children as text nodes interleaved with tagged spans for each mark range, nesting overlapping marks. */
export function renderMarkedText(node: HTMLElement, text: string, marks: MarkRange[] = []): void {
  node.textContent = "";

  const ranges = marks
    .map((mark) => ({
      type: mark.type,
      start: Math.max(0, Math.min(mark.start, text.length)),
      end: Math.max(0, Math.min(mark.end, text.length)),
      data: mark.data,
    }))
    .filter((mark) => mark.end > mark.start);

  const boundaries = Array.from(new Set([0, text.length, ...ranges.flatMap((r) => [r.start, r.end])])).sort(
    (a, b) => a - b,
  );

  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    if (start >= end) continue;

    const active = ranges.filter((r) => r.start <= start && r.end >= end);

    let container: HTMLElement | null = null;
    for (const range of active) {
      const tag = MARK_REGISTRY[range.type]?.tag;
      if (!tag) continue;
      const el = document.createElement(tag);
      if (tag === "code") {
        el.className = "rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]";
      }
      if (tag === "a") {
        el.setAttribute("href", range.data?.href ?? "#");
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
        el.className = "text-blue-600 underline decoration-blue-600/40 hover:decoration-blue-600";
      }
      if (tag === "mark" && range.data?.color) {
        el.style.backgroundColor = range.data.color;
        el.className = "rounded-sm";
      }
      (container ?? node).appendChild(el);
      container = el;
    }

    (container ?? node).appendChild(document.createTextNode(text.slice(start, end)));
  }
}

/** Converts a (DOM text node, offset-within-node) position into a plain-text character offset across `container`. */
export function getTextOffset(container: HTMLElement, targetNode: Node, targetOffset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let charIndex = 0;
  let current = walker.nextNode();

  while (current) {
    if (current === targetNode) {
      return charIndex + targetOffset;
    }
    charIndex += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }

  return charIndex;
}

/** Restores a selection given plain-text character offsets across `node`'s (possibly nested) text nodes. */
export function setSelectionByTextOffsets(node: HTMLElement, start: number, end: number): void {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let charIndex = 0;
  let startNode: Node | null = null;
  let startOffset = 0;
  let endNode: Node | null = null;
  let endOffset = 0;

  let current = walker.nextNode();
  while (current) {
    const length = current.textContent?.length ?? 0;

    if (startNode === null && charIndex + length >= start) {
      startNode = current;
      startOffset = start - charIndex;
    }
    if (endNode === null && charIndex + length >= end) {
      endNode = current;
      endOffset = end - charIndex;
    }

    charIndex += length;
    current = walker.nextNode();
  }

  if (!startNode) {
    startNode = node;
    startOffset = 0;
  }
  if (!endNode) {
    endNode = startNode;
    endOffset = startOffset;
  }

  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
