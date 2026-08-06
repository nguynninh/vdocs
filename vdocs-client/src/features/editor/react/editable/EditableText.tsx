"use client";

import { useEffect, useRef } from "react";

import { useEditor } from "../EditorProvider";
import type { MarkRange } from "../../engine/mark/mark.types";
import { parseTabularClipboardText } from "../../blocks/table/table.parser";
import { getTextOffset, renderMarkedText, setSelectionByTextOffsets } from "./renderMarkedText";
import { mapSlashCommandToBlockType } from "../../features/slash-command/mapSlashCommandToBlockType";
import { SlashCommandPlugin } from "../../features/slash-command/SlashCommandPlugin";
import type { SlashCommandPluginHandle } from "../../features/slash-command/SlashCommandPlugin";
import { AiSuggestionPlugin } from "../../features/ai-suggestion/AiSuggestionPlugin";
import type { AiSuggestionPluginHandle } from "../../features/ai-suggestion/AiSuggestionPlugin";

export interface EditableTextProps {
  blockId: string;
  text: string;
  marks?: MarkRange[];
  onChange: (text: string) => void;
  onEnter: () => void;
  onBackspaceAtStart: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function EditableText({
  blockId,
  text,
  marks,
  onChange,
  onEnter,
  onBackspaceAtStart,
  onFocus,
  onBlur,
}: EditableTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const slashCommandRef = useRef<SlashCommandPluginHandle>(null);
  const aiSuggestionRef = useRef<AiSuggestionPluginHandle>(null);
  const marksSignatureRef = useRef<string>("");
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const {
    state,
    clearFocus,
    convertBlockType,
    splitPasteIntoBlocks,
    insertTableAfterBlock,
    toggleMark,
    canEdit,
  } = useEditor();

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

    const marksSignature = JSON.stringify(marks ?? []);
    if (node.textContent === text && marksSignatureRef.current === marksSignature) return;
    marksSignatureRef.current = marksSignature;

    renderMarkedText(node, text, marks);

    if (window.document.activeElement !== node) return;

    const pendingSelection = pendingSelectionRef.current;
    pendingSelectionRef.current = null;

    if (pendingSelection) {
      // A toggleMark just rebuilt the DOM out from under an active selection
      // (e.g. Cmd/Ctrl+B) — restore it instead of falling through to the
      // collapse-to-end below, which would drop the user's selection.
      setSelectionByTextOffsets(node, pendingSelection.start, pendingSelection.end);
      return;
    }

    // While typing, onInput already keeps state text equal to the DOM text, so this
    // effect is a no-op above. When it isn't — e.g. a markdown-shortcut conversion
    // strips the "# "/"- " marker out from under an actively focused node — restore
    // the caret to the end instead of leaving focus on a node whose content just
    // changed underneath it.
    const range = window.document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [text, marks]);

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
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
            event.preventDefault();
            // Sidebar (components/ui/sidebar.tsx) listens for the same
            // Cmd/Ctrl+B on `window` to toggle itself — stop it here so
            // bolding text doesn't also flip the sidebar open/closed.
            event.stopPropagation();

            const node = ref.current;
            const domSelection = window.getSelection();
            if (!node || !domSelection || domSelection.rangeCount === 0 || domSelection.isCollapsed) {
              return;
            }

            const start = Math.min(
              getTextOffset(node, domSelection.anchorNode!, domSelection.anchorOffset),
              getTextOffset(node, domSelection.focusNode!, domSelection.focusOffset),
            );
            const end = Math.max(
              getTextOffset(node, domSelection.anchorNode!, domSelection.anchorOffset),
              getTextOffset(node, domSelection.focusNode!, domSelection.focusOffset),
            );

            pendingSelectionRef.current = { start, end };
            toggleMark(blockId, start, end, "bold");
            return;
          }

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
