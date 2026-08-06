"use client";

import { useEffect, useRef } from "react";

import { useEditor } from "../EditorProvider";
import { parseTabularClipboardText } from "../../blocks/table/table.parser";
import { mapSlashCommandToBlockType } from "../../features/slash-command/mapSlashCommandToBlockType";
import { SlashCommandPlugin } from "../../features/slash-command/SlashCommandPlugin";
import type { SlashCommandPluginHandle } from "../../features/slash-command/SlashCommandPlugin";
import { AiSuggestionPlugin } from "../../features/ai-suggestion/AiSuggestionPlugin";
import type { AiSuggestionPluginHandle } from "../../features/ai-suggestion/AiSuggestionPlugin";

export interface EditableTextProps {
  blockId: string;
  text: string;
  onChange: (text: string) => void;
  onEnter: () => void;
  onBackspaceAtStart: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function EditableText({
  blockId,
  text,
  onChange,
  onEnter,
  onBackspaceAtStart,
  onFocus,
  onBlur,
}: EditableTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const slashCommandRef = useRef<SlashCommandPluginHandle>(null);
  const aiSuggestionRef = useRef<AiSuggestionPluginHandle>(null);
  const { state, clearFocus, convertBlockType, splitPasteIntoBlocks, insertTableAfterBlock, canEdit } =
    useEditor();

  useEffect(() => {
    if (state.focusBlockId !== blockId || !ref.current) return;

    const node = ref.current;
    node.focus();

    const range = window.document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    clearFocus();
  }, [state.focusBlockId, blockId, clearFocus]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (node.textContent === text) return;

    node.textContent = text;

    // While typing, onInput already keeps state text equal to the DOM text, so this
    // effect is a no-op above. When it isn't — e.g. a markdown-shortcut conversion
    // strips the "# "/"- " marker out from under an actively focused node — restore
    // the caret to the end instead of leaving focus on a node whose content just
    // changed underneath it.
    if (window.document.activeElement === node) {
      const range = window.document.createRange();
      range.selectNodeContents(node);
      range.collapse(false);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [text]);

  const syncSlashCommandMenu = (nextText: string) => {
    if (nextText !== "/") {
      slashCommandRef.current?.close();
      return;
    }

    const selection = window.getSelection();
    const rect = selection?.rangeCount ? selection.getRangeAt(0).getBoundingClientRect() : null;
    if (!rect) return;

    slashCommandRef.current?.open({ top: rect.top, bottom: rect.bottom, left: rect.left });
  };

  const openAiSuggestionMenu = () => {
    const selection = window.getSelection();
    const rect = selection?.rangeCount ? selection.getRangeAt(0).getBoundingClientRect() : null;
    if (!rect) return;

    aiSuggestionRef.current?.open({ top: rect.bottom + 4, left: rect.left });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        contentEditable={canEdit}
        suppressContentEditableWarning
        className="py-1 outline-none"
        onFocus={onFocus}
        onBlur={onBlur}
        onInput={(event) => {
          const nextText = event.currentTarget.textContent ?? "";
          onChange(nextText);
          syncSlashCommandMenu(nextText);
        }}
        onPaste={(event) => {
          const clipboardText = event.clipboardData.getData("text/plain");
          if (!clipboardText) return;

          const tableRows = parseTabularClipboardText(clipboardText);
          if (tableRows) {
            event.preventDefault();
            insertTableAfterBlock(blockId, tableRows);
            return;
          }

          const lines = clipboardText.split(/\r\n|\r|\n/);
          if (lines.length <= 1) {
            // Single-line paste: let the browser's native insertion handle
            // caret placement and undo history as before.
            return;
          }

          event.preventDefault();

          const node = event.currentTarget;
          const fullText = node.textContent ?? "";
          const selection = window.getSelection();
          const caretOffset =
            selection && selection.rangeCount > 0
              ? selection.getRangeAt(0).startOffset
              : fullText.length;

          const before = fullText.slice(0, caretOffset);
          const after = fullText.slice(caretOffset);

          splitPasteIntoBlocks(blockId, before, lines, after);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            // While a Vietnamese/CJK IME composition is active (the underlined
            // in-progress text), Enter confirms the composition rather than
            // submitting the line — let the IME handle it, or the composed
            // text ends up committed into both the old and new block.
            if (event.nativeEvent.isComposing || event.keyCode === 229) {
              return;
            }

            event.preventDefault();
            onEnter();
            return;
          }

          if (event.key === " " && event.currentTarget.textContent === "") {
            event.preventDefault();
            openAiSuggestionMenu();
            return;
          }

          if (event.key === "Backspace") {
            const selection = window.getSelection();
            const atStart =
              selection !== null &&
              selection.isCollapsed &&
              selection.anchorOffset === 0 &&
              selection.focusOffset === 0;

            if (atStart) {
              event.preventDefault();
              onBackspaceAtStart();
            }
          }
        }}
      />
      <SlashCommandPlugin
        ref={slashCommandRef}
        onSelectCommand={(item) => {
          const nextBlockType = mapSlashCommandToBlockType(item.id);
          if (nextBlockType) {
            // convertBlockType re-focuses the block itself once its (possibly new) view mounts.
            convertBlockType(blockId, nextBlockType, "");
            return;
          }
          onChange("");
          if (ref.current) ref.current.textContent = "";
          ref.current?.focus();
        }}
      />
      <AiSuggestionPlugin
        ref={aiSuggestionRef}
        onSelectSuggestion={() => {
          // No AI backend wired up yet — just return focus to the block for now.
          ref.current?.focus();
        }}
      />
    </div>
  );
}
