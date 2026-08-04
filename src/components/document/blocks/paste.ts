import { createBlock, type Block, type BlockType } from "./types";

const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const NUMBERED_RE = /^\d+[.)]\s+(.*)$/;
const BULLETED_RE = /^[-*•]\s+(.*)$/;
const TODO_RE = /^[-*]\s*\[( |x|X)\]\s*(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;
const DIVIDER_RE = /^(-{3,}|\*{3,}|_{3,})$/;
const CODE_FENCE_RE = /^```/;
const TABLE_DELIMITERS = ["\t", "|", ","];

function parseDelimitedRows(raw: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    const next = raw[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (!quoted && char === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  rows.push(row);
  return rows.filter((item) => item.some((value) => value !== ""));
}

function parsePastedTable(raw: string): string[][] | null {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;

  const candidates = TABLE_DELIMITERS.map((delimiter) => parseDelimitedRows(normalized, delimiter));
  const rows = candidates
    .filter((candidate) => candidate.length > 1 && candidate[0].length > 1)
    .sort((a, b) => b[0].length - a[0].length)[0];

  if (!rows) return null;
  if (rows.every((row) => row[0] === "")) rows.forEach((row) => row.shift());
  if (rows.every((row) => row[row.length - 1] === "")) rows.forEach((row) => row.pop());

  const width = Math.max(...rows.map((row) => row.length));
  return rows.map((row) => [...row, ...Array(width - row.length).fill("")]);
}

/**
 * Converts pasted plain text into blocks by detecting common list/heading/
 * code markers line-by-line, so pasting a structured checklist or markdown
 * snippet lands as real blocks instead of one raw text blob.
 */
export function parsePastedText(raw: string): Block[] {
  const table = parsePastedTable(raw);
  if (table) {
    return [{ ...createBlock("table"), table }];
  }

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const result: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (CODE_FENCE_RE.test(trimmed)) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !CODE_FENCE_RE.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      result.push(createBlock("code", codeLines.join("\n")));
      continue;
    }

    if (trimmed === "") {
      i += 1;
      continue;
    }

    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const type: BlockType = level === 1 ? "heading1" : level === 2 ? "heading2" : "heading3";
      result.push(createBlock(type, headingMatch[2]));
      i += 1;
      continue;
    }

    if (DIVIDER_RE.test(trimmed)) {
      result.push(createBlock("divider", ""));
      i += 1;
      continue;
    }

    const todoMatch = trimmed.match(TODO_RE);
    if (todoMatch) {
      const block = createBlock("todo", todoMatch[2]);
      block.checked = todoMatch[1].toLowerCase() === "x";
      result.push(block);
      i += 1;
      continue;
    }

    const numberedMatch = trimmed.match(NUMBERED_RE);
    if (numberedMatch) {
      result.push(createBlock("numbered", numberedMatch[1]));
      i += 1;
      continue;
    }

    const bulletedMatch = trimmed.match(BULLETED_RE);
    if (bulletedMatch) {
      result.push(createBlock("bulleted", bulletedMatch[1]));
      i += 1;
      continue;
    }

    const quoteMatch = trimmed.match(QUOTE_RE);
    if (quoteMatch) {
      result.push(createBlock("quote", quoteMatch[1]));
      i += 1;
      continue;
    }

    result.push(createBlock("paragraph", trimmed));
    i += 1;
  }

  if (result.length === 0) {
    result.push(createBlock("paragraph", ""));
  }

  return result;
}
