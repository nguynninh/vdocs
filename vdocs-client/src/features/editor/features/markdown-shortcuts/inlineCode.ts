export interface InlineCodeMatch {
  /** Character offset of the opening backtick. */
  start: number;
  /** Length of the full `` `text` `` span, backticks included. */
  matchLength: number;
  /** Text enclosed by the backticks. */
  content: string;
}

/** Matches a completed `` `code` `` span with non-empty content and no nested backtick. */
const INLINE_CODE_PATTERN = /`([^`]+)`/;

export function matchInlineCode(text: string): InlineCodeMatch | null {
  const match = INLINE_CODE_PATTERN.exec(text);
  if (!match) return null;

  return { start: match.index, matchLength: match[0].length, content: match[1] };
}
