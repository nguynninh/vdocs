import type { BlockType } from "../engine/block/block.types";
import type { MarkRange, MarkType } from "../engine/mark/mark.types";

export interface ImportBlock {
  type: BlockType;
  text: string;
  marks?: MarkRange[];
  table?: string[][];
  cellMarks?: MarkRange[][][];
  codeLanguage?: string;
  checked?: boolean;
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const ORDERED_LIST_RE = /^\s*\d+[.)]\s+(.*)$/;
const TODO_LIST_RE = /^\s*[-*+]\s+\[( |x|X)\]\s+(.*)$/;
const BULLET_LIST_RE = /^\s*[-*+]\s+(.*)$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;
const DIVIDER_RE = /^\s*([-*_])\s*(\1\s*){2,}$/;
const FENCE_RE = /^```\s*([a-zA-Z0-9_+-]*)\s*$/;
const TABLE_ROW_RE = /^\s*\|?.*\|.*\|?\s*$/;
const TABLE_SEPARATOR_RE = /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/;

/** Strips `**bold**`/`__bold__` and `` `code` `` markers from a line of
 * markdown, returning the plain text plus the mark ranges those markers
 * covered. Other inline markdown (italic, links, images) has no matching
 * mark/block in this editor's schema, so it's flattened to plain text
 * instead of being dropped silently. */
function parseInline(raw: string): { text: string; marks: MarkRange[] } {
  const withoutImages = raw.replace(/!\[([^\]]*)\]\([^)]*\)/g, (_match, alt: string) =>
    alt ? `[${alt}]` : ""
  );
  const withoutLinks = withoutImages.replace(/\[([^\]]*)\]\(([^)]*)\)/g, (_match, label: string, url: string) =>
    label ? `${label} (${url})` : url
  );

  const tokenRe = /(\*\*|__)(.+?)\1|(`)(.+?)\3|(\*|_)(.+?)\5/g;
  let text = "";
  const marks: MarkRange[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(withoutLinks))) {
    text += withoutLinks.slice(lastIndex, match.index);

    let type: MarkType | null = null;
    let inner = "";
    if (match[1]) {
      type = "bold";
      inner = match[2];
    } else if (match[3]) {
      type = "code";
      inner = match[4];
    } else if (match[5]) {
      inner = match[6];
    }

    const start = text.length;
    text += inner;
    if (type) marks.push({ type, start, end: text.length });

    lastIndex = tokenRe.lastIndex;
  }
  text += withoutLinks.slice(lastIndex);

  return { text, marks };
}

function parseTableRow(line: string): { cells: string[]; marks: MarkRange[][] } {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const parsed = inner.split("|").map((cell) => parseInline(cell.trim()));
  return { cells: parsed.map((cell) => cell.text), marks: parsed.map((cell) => cell.marks) };
}

/** Converts a markdown document into this editor's flat block list. Covers
 * headings, paragraphs, bulleted/numbered lists, blockquotes, fenced code
 * (with language), horizontal rules, GFM tables, and inline bold/code —
 * everything the current block/mark schema can represent. Nested lists,
 * italics, links, and images have no equivalent block/mark here, so they're
 * flattened to plain text rather than dropped. */
export function parseMarkdownToBlocks(markdown: string): ImportBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: ImportBlock[] = [];

  let paragraphBuffer: string[] = [];
  let quoteBuffer: string[] = [];

  function flushParagraph() {
    if (!paragraphBuffer.length) return;
    const { text, marks } = parseInline(paragraphBuffer.join(" "));
    if (text.trim().length) blocks.push({ type: "paragraph", text, ...(marks.length ? { marks } : {}) });
    paragraphBuffer = [];
  }

  function flushQuote() {
    if (!quoteBuffer.length) return;
    const { text, marks } = parseInline(quoteBuffer.join(" "));
    blocks.push({ type: "quote", text, ...(marks.length ? { marks } : {}) });
    quoteBuffer = [];
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch) {
      flushParagraph();
      flushQuote();
      const language = fenceMatch[1] || undefined;
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE_RE.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      blocks.push({
        type: "codeBlock",
        text: codeLines.join("\n"),
        ...(language ? { codeLanguage: language } : {}),
      });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushQuote();
      continue;
    }

    if (DIVIDER_RE.test(line)) {
      flushParagraph();
      flushQuote();
      blocks.push({ type: "divider", text: "" });
      continue;
    }

    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      flushParagraph();
      flushQuote();
      const level = Math.min(headingMatch[1].length, 3);
      const { text, marks } = parseInline(headingMatch[2]);
      blocks.push({
        type: (`heading${level}` as BlockType),
        text,
        ...(marks.length ? { marks } : {}),
      });
      continue;
    }

    const quoteMatch = line.match(QUOTE_RE);
    if (quoteMatch) {
      flushParagraph();
      quoteBuffer.push(quoteMatch[1]);
      continue;
    }
    flushQuote();

    if (TABLE_ROW_RE.test(line) && lines[i + 1] && TABLE_SEPARATOR_RE.test(lines[i + 1])) {
      flushParagraph();
      const headerRow = parseTableRow(line);
      const rows: string[][] = [headerRow.cells];
      const cellMarks: MarkRange[][][] = [headerRow.marks];
      i += 2;
      while (i < lines.length && TABLE_ROW_RE.test(lines[i])) {
        const row = parseTableRow(lines[i]);
        rows.push(row.cells);
        cellMarks.push(row.marks);
        i += 1;
      }
      i -= 1;
      blocks.push({ type: "table", text: "", table: rows, cellMarks });
      continue;
    }

    const todoMatch = line.match(TODO_LIST_RE);
    if (todoMatch) {
      flushParagraph();
      const { text, marks } = parseInline(todoMatch[2]);
      const checked = todoMatch[1] === "x" || todoMatch[1] === "X";
      blocks.push({ type: "todoListItem", text, checked, ...(marks.length ? { marks } : {}) });
      continue;
    }

    const bulletMatch = line.match(BULLET_LIST_RE);
    if (bulletMatch) {
      flushParagraph();
      const { text, marks } = parseInline(bulletMatch[1]);
      blocks.push({ type: "bulletedListItem", text, ...(marks.length ? { marks } : {}) });
      continue;
    }

    const orderedMatch = line.match(ORDERED_LIST_RE);
    if (orderedMatch) {
      flushParagraph();
      const { text, marks } = parseInline(orderedMatch[1]);
      blocks.push({ type: "numberedListItem", text, ...(marks.length ? { marks } : {}) });
      continue;
    }

    paragraphBuffer.push(line.trim());
  }

  flushParagraph();
  flushQuote();

  return blocks;
}
