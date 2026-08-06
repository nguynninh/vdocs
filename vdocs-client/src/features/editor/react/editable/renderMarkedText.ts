import type { MarkRange } from "../../engine/mark/mark.types";

/** Rebuilds `node`'s children as text nodes interleaved with `<strong>` spans for bold ranges. */
export function renderMarkedText(node: HTMLElement, text: string, marks: MarkRange[] = []): void {
  node.textContent = "";

  const boldRanges = marks
    .filter((mark) => mark.type === "bold")
    .sort((a, b) => a.start - b.start);

  let cursor = 0;
  for (const range of boldRanges) {
    const start = Math.max(cursor, Math.min(range.start, text.length));
    const end = Math.max(start, Math.min(range.end, text.length));

    if (start > cursor) {
      node.appendChild(document.createTextNode(text.slice(cursor, start)));
    }
    if (end > start) {
      const strong = document.createElement("strong");
      strong.textContent = text.slice(start, end);
      node.appendChild(strong);
    }
    cursor = end;
  }

  if (cursor < text.length) {
    node.appendChild(document.createTextNode(text.slice(cursor)));
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
