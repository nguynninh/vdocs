import { codeBlockShortcutRule } from "./code.rules";
import { dividerShortcutRule } from "./divider.rules";
import { headingShortcutRule } from "./heading.rules";
import { bulletedListShortcutRule, numberedListShortcutRule } from "./list.rules";
import type { MarkdownShortcutMatch, MarkdownShortcutRule } from "./MarkdownShortcutRule";
import { quoteShortcutRule } from "./quote.rules";

const rules: MarkdownShortcutRule[] = [
  headingShortcutRule,
  bulletedListShortcutRule,
  numberedListShortcutRule,
  quoteShortcutRule,
  dividerShortcutRule,
  codeBlockShortcutRule,
];

export function matchMarkdownShortcut(text: string): MarkdownShortcutMatch | null {
  for (const rule of rules) {
    const match = rule(text);
    if (match) return match;
  }
  return null;
}
