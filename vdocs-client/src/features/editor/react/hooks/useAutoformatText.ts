import { useCallback } from "react";

import { matchMarkdownShortcut } from "../../features/markdown-shortcuts";
import { matchInlineCode } from "../../features/markdown-shortcuts/inlineCode";
import type { BlockNode } from "../../engine/block/block.types";
import { useEditor } from "../EditorProvider";

export function useAutoformatText(block: BlockNode) {
  const { updateBlockText, convertBlockType, insertBlockAfterFocused, toggleMark, setChecked } = useEditor();

  return useCallback(
    (text: string) => {
      if (block.type === "paragraph") {
        const match = matchMarkdownShortcut(text);
        if (match) {
          convertBlockType(block.id, match.blockType, match.text);
          if (match.blockType === "todoListItem" && match.checked) {
            setChecked(block.id, true);
          }
          // Divider has no editable text of its own, so hop straight to a
          // fresh paragraph below it instead of leaving nothing focused.
          if (match.blockType === "divider") {
            insertBlockAfterFocused(block.id);
          }
          return;
        }
      }

      // Inline marks apply to any text block — headings, list items, quotes —
      // not just paragraphs. codeBlock is excluded since its backticks are
      // literal source text, not a shortcut to convert.
      if (block.type !== "codeBlock") {
        const inlineCode = matchInlineCode(text);
        if (inlineCode) {
          const { start, matchLength, content } = inlineCode;
          const nextText = text.slice(0, start) + content + text.slice(start + matchLength);
          updateBlockText(block.id, nextText);
          toggleMark(block.id, start, start + content.length, "code");
          return;
        }
      }

      updateBlockText(block.id, text);
    },
    [block.id, block.type, updateBlockText, convertBlockType, insertBlockAfterFocused, toggleMark, setChecked],
  );
}
