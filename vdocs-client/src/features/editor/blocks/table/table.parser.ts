// Delimiters tried in priority order when sniffing pasted clipboard text for
// tabular data. Plain string.split is fine here (not byte-level), so
// multi-byte UTF-8 text (e.g. Vietnamese diacritics) splits correctly.
const DELIMITERS: Array<{ name: string; split: (line: string) => string[] }> = [
  { name: "tab", split: (line) => line.split("\t") },
  { name: "comma", split: (line) => line.split(",") },
  { name: "semicolon", split: (line) => line.split(";") },
  { name: "spaces", split: (line) => line.split(/ {2,}/) },
];

/**
 * Detects whether pasted clipboard text looks like a tabular grid and, if so,
 * parses it into rows of trimmed cell strings. Returns null when the text
 * doesn't look tabular, so callers can fall back to normal paste handling.
 */
export function parseTabularClipboardText(clipboardText: string): string[][] | null {
  const lines = clipboardText
    .split(/\r\n|\r|\n/)
    .filter((line, index, all) => !(line.trim() === "" && index === all.length - 1));

  if (lines.length < 2) {
    return null;
  }

  for (const delimiter of DELIMITERS) {
    const rows = lines.map((line) => delimiter.split(line).map((cell) => cell.trim()));
    const columnCount = rows[0].length;

    if (columnCount < 2) {
      continue;
    }

    const allRowsMatch = rows.every((row) => row.length === columnCount);
    if (allRowsMatch) {
      return rows;
    }
  }

  return null;
}
