import { useCallback } from "react";

import { matchMarkdownShortcut } from "../../features/markdown-shortcuts";
import type { BlockNode } from "../../engine/block/block.types";
import { useEditor } from "../EditorProvider";

export function useAutoformatText(block: BlockNode) {
  const { updateBlockText, convertBlockType, insertBlockAfterFocused } = useEditor();

  return useCallback(
    (text: string) => {
      if (block.type === "paragraph") {
        const match = matchMarkdownShortcut(text);
        if (match) {
          convertBlockType(block.id, match.blockType, match.text);
          // Divider has no editable text of its own, so hop straight to a
          // fresh paragraph below it instead of leaving nothing focused.
          if (match.blockType === "divider") {
            insertBlockAfterFocused(block.id);
          }
          return;
        }
      }
      updateBlockText(block.id, text);
    },
    [block.id, block.type, updateBlockText, convertBlockType, insertBlockAfterFocused],
  );
}
