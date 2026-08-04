"use client";

import * as React from "react";

import { useLocale } from "@/components/layout/locale-provider";
import { cn } from "@/lib/utils";

import BlockRenderer from "./blocks/BlockRenderer";
import { filterSlashMenuItems } from "./blocks/block-registry";
import { parsePastedText } from "./blocks/paste";
import {
  applyHighlight,
  applyLink,
  clearHighlight,
  mergeMarksForConcat,
  remapMarksOnEdit,
  sliceMarks,
  toggleTextStyle,
  type TextStyleKey,
} from "./blocks/richtext";
import {
  createBlock,
  LIST_BLOCK_TYPES,
  MAX_BLOCK_INDENT_LEVEL,
  type Block,
  type BlockType,
  type HighlightColorId,
} from "./blocks/types";
import HighlightToolbar from "./HighlightToolbar";
import SlashCommandMenu from "./SlashCommandMenu";

interface HighlightSelectionState {
  blockId: string;
  start: number;
  end: number;
  rect: DOMRect | null;
}

interface SlashMenuState {
  blockId: string;
  query: string;
  position: { top: number; left: number; anchorTop?: number };
  activeIndex: number;
}

interface TurnIntoMenuState {
  blockId: string;
  position: { top: number; left: number; anchorTop?: number };
  activeIndex: number;
}

const GUTTER_CLICK_MOVE_THRESHOLD = 4;

interface PendingFocus {
  blockId: string;
  selectionIndex: number;
}

interface BlockSelection {
  start: number;
  end: number;
}

function computeNumberedIndices(blocks: Block[]): Array<number | null> {
  const counters: number[] = [];
  return blocks.map((block) => {
    const level = block.level ?? 0;
    if (block.type !== "numbered") {
      counters.length = Math.min(counters.length, level);
      return null;
    }
    counters[level] = (counters[level] ?? 0) + 1;
    counters.length = level + 1;
    return counters[level];
  });
}

let measureSpan: HTMLSpanElement | null = null;

function measureTextPixelWidth(text: string, font: string): number {
  if (typeof document === "undefined") return 0;
  if (!measureSpan) {
    measureSpan = document.createElement("span");
    measureSpan.style.position = "absolute";
    measureSpan.style.visibility = "hidden";
    measureSpan.style.whiteSpace = "pre";
    measureSpan.style.top = "-9999px";
    measureSpan.style.left = "-9999px";
    document.body.appendChild(measureSpan);
  }
  measureSpan.style.font = font;
  measureSpan.textContent = text || " ";
  return measureSpan.offsetWidth;
}

function blockToPlainText(block: Block, numberedIndex: number | null): string {
  const indent = "  ".repeat(block.level ?? 0);
  if (block.type === "numbered") return `${indent}${numberedIndex}. ${block.text}`;
  if (block.type === "bulleted") return `${indent}• ${block.text}`;
  if (block.type === "todo") return `${indent}${block.checked ? "[x]" : "[ ]"} ${block.text}`;
  if (block.type === "table") return (block.table ?? []).map((row) => row.join("\t")).join("\n");
  return `${indent}${block.text}`;
}

interface DocumentBlockEditorProps {
  documentId: string;
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  placeholder: string;
  className?: string;
  sublistHintEnabled?: boolean;
  onSublistUsed?: () => void;
}

const DocumentBlockEditor = React.forwardRef<HTMLTextAreaElement, DocumentBlockEditorProps>(
  function DocumentBlockEditor(
    { documentId, blocks, onChange, placeholder, className, sublistHintEnabled, onSublistUsed },
    forwardedRef
  ) {
    const { t } = useLocale();
    const [slashMenu, setSlashMenu] = React.useState<SlashMenuState | null>(null);
    const [pendingFocus, setPendingFocus] = React.useState<PendingFocus | null>(null);
    const [selection, setSelection] = React.useState<BlockSelection | null>(null);
    const [turnIntoMenu, setTurnIntoMenu] = React.useState<TurnIntoMenuState | null>(null);
    const [reorderInsertIndex, setReorderInsertIndex] = React.useState<number | null>(null);
    const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
    const [dragGhostPos, setDragGhostPos] = React.useState<{ x: number; y: number } | null>(null);
    const [highlightWidths, setHighlightWidths] = React.useState<Record<string, number>>({});
    const [focusedBlockId, setFocusedBlockId] = React.useState<string | null>(null);
    const [highlightSelection, setHighlightSelection] =
      React.useState<HighlightSelectionState | null>(null);
    const textareaRefs = React.useRef(new Map<string, HTMLTextAreaElement>());
    const rowRefs = React.useRef(new Map<string, HTMLDivElement>());
    const turnIntoMenuRef = React.useRef<HTMLDivElement>(null);
    const highlightToolbarRef = React.useRef<HTMLDivElement>(null);
    const dragStateRef = React.useRef<{
      startIndex: number;
      mode: "text" | "range" | "reorder";
    } | null>(null);
    const gutterMouseDownRef = React.useRef<{ blockId: string; x: number; y: number } | null>(
      null
    );
    const reorderInsertIndexRef = React.useRef<number | null>(null);

    React.useEffect(() => {
      if (!turnIntoMenu) return;
      function handleOutsideMouseDown(event: MouseEvent) {
        if (turnIntoMenuRef.current?.contains(event.target as Node)) return;
        setTurnIntoMenu(null);
      }
      document.addEventListener("mousedown", handleOutsideMouseDown);
      return () => document.removeEventListener("mousedown", handleOutsideMouseDown);
    }, [turnIntoMenu]);

    React.useEffect(() => {
      if (!highlightSelection?.rect) return;
      function handleOutsideMouseDown(event: MouseEvent) {
        if (highlightToolbarRef.current?.contains(event.target as Node)) return;
        setHighlightSelection(null);
      }
      document.addEventListener("mousedown", handleOutsideMouseDown);
      return () => document.removeEventListener("mousedown", handleOutsideMouseDown);
    }, [highlightSelection?.rect]);

    React.useLayoutEffect(() => {
      if (!selection) return;
      const widths: Record<string, number> = {};
      for (let i = selection.start; i <= selection.end; i += 1) {
        const block = blocks[i];
        const textarea = block && textareaRefs.current.get(block.id);
        const row = block && rowRefs.current.get(block.id);
        if (!block || !textarea || !row) continue;
        const font = window.getComputedStyle(textarea).font;
        const textWidth = measureTextPixelWidth(block.text, font);
        const offset = textarea.getBoundingClientRect().left - row.getBoundingClientRect().left;
        widths[block.id] = offset + textWidth + 6;
      }
      setHighlightWidths(widths);
    }, [selection, blocks]);

    React.useImperativeHandle(
      forwardedRef,
      () => textareaRefs.current.get(blocks[0]?.id) as HTMLTextAreaElement
    );

    React.useLayoutEffect(() => {
      if (!pendingFocus) return;
      const el = textareaRefs.current.get(pendingFocus.blockId);
      if (el) {
        el.focus();
        el.setSelectionRange(pendingFocus.selectionIndex, pendingFocus.selectionIndex);
      }
      setPendingFocus(null);
    }, [pendingFocus, blocks]);

    function focusBlock(id: string, caret: "start" | "end" | number, text = "") {
      const selectionIndex = caret === "start" ? 0 : caret === "end" ? text.length : caret;
      setPendingFocus({ blockId: id, selectionIndex });
    }

    function updateBlock(id: string, patch: Partial<Block>) {
      onChange(blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)));
    }

    function blockTypePatch(type: BlockType): Partial<Block> {
      const patch: Partial<Block> = {
        type,
        checked: type === "todo" ? false : undefined,
      };
      if (!LIST_BLOCK_TYPES.includes(type)) patch.level = undefined;
      if (type !== "image") patch.imageSrc = undefined;
      return patch;
    }

    function openSlashMenu(blockId: string) {
      const el = textareaRefs.current.get(blockId);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSlashMenu({
        blockId,
        query: "",
        position: { top: rect.bottom + 4, left: rect.left, anchorTop: rect.top },
        activeIndex: 0,
      });
    }

    function closeSlashMenu() {
      setSlashMenu(null);
    }

    function handleTextChange(block: Block, value: string) {
      const caret = textareaRefs.current.get(block.id)?.selectionStart ?? undefined;
      let nextText = value;
      let nextMarks = remapMarksOnEdit(block.text, value, block.marks ?? [], caret);
      let nextCaret: number | null = null;

      if (caret !== undefined && value.length === block.text.length + 1 && value[caret - 1] === "`") {
        const openIndex = value.lastIndexOf("`", caret - 2);
        if (openIndex !== -1 && openIndex < caret - 1) {
          nextText = value.slice(0, openIndex) + value.slice(openIndex + 1, caret - 1) + value.slice(caret);
          nextCaret = caret - 2;
          nextMarks = applyHighlight(
            remapMarksOnEdit(value, nextText, nextMarks, nextCaret),
            openIndex,
            nextCaret,
            "code"
          );
        }
      }

      updateBlock(block.id, { text: nextText, marks: nextMarks.length ? nextMarks : undefined });
      if (nextCaret !== null) focusBlock(block.id, nextCaret);

      if (slashMenu?.blockId === block.id) {
        if (nextText.startsWith("/")) {
          setSlashMenu({ ...slashMenu, query: nextText.slice(1) });
        } else {
          closeSlashMenu();
        }
        return;
      }

      if (block.text === "" && nextText === "/") {
        openSlashMenu(block.id);
      }
    }

    function insertChildPagesBlock(blockId: string) {
      updateBlock(blockId, { ...blockTypePatch("childPages"), text: "" });
      onSublistUsed?.();
    }

    function handleSelectSlashType(type: BlockType) {
      if (!slashMenu) return;
      setSelection(null);
      setHighlightSelection(null);
      setDraggingIndex(null);
      setDragGhostPos(null);
      reorderInsertIndexRef.current = null;
      setReorderInsertIndex(null);
      const blockId = slashMenu.blockId;
      const index = blocks.findIndex((b) => b.id === blockId);
      if (index === -1) return;

      if (type === "divider") {
        const dividerBlock: Block = { ...blocks[index], ...blockTypePatch("divider"), text: "" };
        const nextBlock = createBlock("paragraph");
        const next = [...blocks];
        next.splice(index, 1, dividerBlock, nextBlock);
        onChange(next);
        closeSlashMenu();
        focusBlock(nextBlock.id, "start");
        return;
      }

      if (type === "childPages") {
        insertChildPagesBlock(blockId);
        closeSlashMenu();
        focusBlock(blockId, "start");
        return;
      }

      updateBlock(blockId, {
        ...blockTypePatch(type),
        text: "",
      });
      closeSlashMenu();
      focusBlock(blockId, "start");
    }

    function addBlockAfter(index: number) {
      const newBlock = createBlock("paragraph");
      const next = [...blocks];
      next.splice(index + 1, 0, newBlock);
      onChange(next);
      focusBlock(newBlock.id, "start");
    }

    function findRowIndexAtY(y: number) {
      let hoveredIndex = 0;
      for (let i = 0; i < blocks.length; i += 1) {
        const el = rowRefs.current.get(blocks[i].id);
        if (!el) continue;
        hoveredIndex = i;
        if (y <= el.getBoundingClientRect().bottom) break;
      }
      return hoveredIndex;
    }

    function findInsertIndexAtY(y: number) {
      for (let i = 0; i < blocks.length; i += 1) {
        const el = rowRefs.current.get(blocks[i].id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (y < rect.top + rect.height / 2) return i;
      }
      return blocks.length;
    }

    function handleDocumentMouseMove(event: MouseEvent) {
      const drag = dragStateRef.current;
      if (!drag) return;

      if (drag.mode === "reorder") {
        setDraggingIndex(drag.startIndex);
        setDragGhostPos({ x: event.clientX, y: event.clientY });
        const insertIndex = findInsertIndexAtY(event.clientY);
        reorderInsertIndexRef.current = insertIndex;
        setReorderInsertIndex(insertIndex);
        return;
      }

      const hoveredIndex = findRowIndexAtY(event.clientY);

      if (drag.mode === "text") {
        if (hoveredIndex === drag.startIndex) return;
        // Cursor left the starting block while dragging: native per-textarea
        // selection can't span blocks, so switch to whole-block selection.
        // The anchor textarea keeps its own native highlight for the part
        // of its text the drag already crossed.
        drag.mode = "range";
      }

      const start = Math.min(drag.startIndex, hoveredIndex);
      const end = Math.max(drag.startIndex, hoveredIndex);
      setSelection({ start, end });
    }

    function handleDocumentMouseUp(event: MouseEvent) {
      const drag = dragStateRef.current;
      const gutterDown = gutterMouseDownRef.current;
      dragStateRef.current = null;
      gutterMouseDownRef.current = null;
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      document.removeEventListener("mouseup", handleDocumentMouseUp);

      if (drag && drag.mode === "text") {
        const draggedBlock = blocks[drag.startIndex];
        const el = draggedBlock && textareaRefs.current.get(draggedBlock.id);
        if (el && el.selectionEnd > el.selectionStart) {
          setHighlightSelection({
            blockId: draggedBlock.id,
            start: el.selectionStart,
            end: el.selectionEnd,
            rect: null,
          });
        } else {
          setHighlightSelection(null);
        }
      }

      if (!gutterDown || !drag) return;
      const moved =
        Math.abs(event.clientX - gutterDown.x) > GUTTER_CLICK_MOVE_THRESHOLD ||
        Math.abs(event.clientY - gutterDown.y) > GUTTER_CLICK_MOVE_THRESHOLD;

      setDraggingIndex(null);
      setDragGhostPos(null);
      reorderInsertIndexRef.current = null;
      setReorderInsertIndex(null);

      if (moved) {
        const insertIndex = findInsertIndexAtY(event.clientY);
        if (insertIndex === null) return;
        const from = drag.startIndex;
        const to = insertIndex > from ? insertIndex - 1 : insertIndex;
        if (to !== from) {
          const next = [...blocks];
          const [movedBlock] = next.splice(from, 1);
          next.splice(to, 0, movedBlock);
          onChange(next);
        }
        return;
      }

      const el = rowRefs.current.get(gutterDown.blockId);
      setTurnIntoMenu({
        blockId: gutterDown.blockId,
        position: el
          ? {
              top: el.getBoundingClientRect().bottom + 4,
              left: el.getBoundingClientRect().left,
              anchorTop: el.getBoundingClientRect().top,
            }
          : { top: event.clientY, left: event.clientX },
        activeIndex: 0,
      });
    }

    function handleGutterMouseDown(index: number, event: React.MouseEvent<HTMLSpanElement>) {
      event.preventDefault();
      dragStateRef.current = { startIndex: index, mode: "reorder" };
      gutterMouseDownRef.current = {
        blockId: blocks[index].id,
        x: event.clientX,
        y: event.clientY,
      };
      document.addEventListener("mousemove", handleDocumentMouseMove);
      document.addEventListener("mouseup", handleDocumentMouseUp);
    }

    function handleTurnInto(blockId: string, type: BlockType) {
      setSelection(null);
      setHighlightSelection(null);
      setTurnIntoMenu(null);
      setDraggingIndex(null);
      setDragGhostPos(null);
      reorderInsertIndexRef.current = null;
      setReorderInsertIndex(null);

      if (type === "divider") {
        const index = blocks.findIndex((b) => b.id === blockId);
        if (index === -1) return;
        const dividerBlock: Block = { ...blocks[index], ...blockTypePatch("divider"), text: "" };
        const nextBlock = createBlock("paragraph");
        const next = [...blocks];
        next.splice(index, 1, dividerBlock, nextBlock);
        onChange(next);
        focusBlock(nextBlock.id, "start");
        return;
      }

      updateBlock(blockId, blockTypePatch(type));
    }

    const handleSlashActiveIndexChange = React.useCallback((activeIndex: number) => {
      setSlashMenu((current) =>
        current && current.activeIndex !== activeIndex ? { ...current, activeIndex } : current
      );
    }, []);

    const handleTurnIntoActiveIndexChange = React.useCallback((activeIndex: number) => {
      setTurnIntoMenu((current) =>
        current && current.activeIndex !== activeIndex ? { ...current, activeIndex } : current
      );
    }, []);

    function handleTextareaMouseDown(index: number) {
      dragStateRef.current = { startIndex: index, mode: "text" };
      document.addEventListener("mousemove", handleDocumentMouseMove);
      document.addEventListener("mouseup", handleDocumentMouseUp);
    }

    function handleSelectionKeyUp(block: Block, event: React.KeyboardEvent<HTMLTextAreaElement>) {
      const el = event.currentTarget;
      if (el.selectionEnd > el.selectionStart) {
        setHighlightSelection({
          blockId: block.id,
          start: el.selectionStart,
          end: el.selectionEnd,
          rect: null,
        });
      } else if (highlightSelection?.blockId === block.id) {
        setHighlightSelection(null);
      }
    }

    function handleApplyHighlight(color: HighlightColorId | null) {
      if (!highlightSelection) return;
      const { blockId, start, end } = highlightSelection;
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      const nextMarks = color
        ? applyHighlight(block.marks ?? [], start, end, color)
        : clearHighlight(block.marks ?? [], start, end);
      updateBlock(blockId, { marks: nextMarks.length ? nextMarks : undefined });
    }

    function applyToggleTextStyle(blockId: string, start: number, end: number, style: TextStyleKey) {
      if (end <= start) return;
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      const nextMarks = toggleTextStyle(block.marks ?? [], start, end, style);
      updateBlock(blockId, { marks: nextMarks.length ? nextMarks : undefined });
    }

    function handleToggleTextStyle(
      block: Block,
      textarea: HTMLTextAreaElement,
      style: TextStyleKey
    ) {
      applyToggleTextStyle(block.id, textarea.selectionStart, textarea.selectionEnd, style);
    }

    function handleToolbarToggleTextStyle(style: TextStyleKey) {
      if (!highlightSelection) return;
      const { blockId, start, end } = highlightSelection;
      applyToggleTextStyle(blockId, start, end, style);
    }

    function handleApplyLink(href: string) {
      if (!highlightSelection) return;
      const { blockId, start, end } = highlightSelection;
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      const nextMarks = applyLink(block.marks ?? [], start, end, href);
      updateBlock(blockId, { marks: nextMarks.length ? nextMarks : undefined });
    }

    function handleLinkClick(block: Block, event: React.MouseEvent<HTMLTextAreaElement>) {
      if (!event.metaKey && !event.ctrlKey) return;
      const caret = event.currentTarget.selectionStart;
      const mark = block.marks?.find(
        (item) => item.color === "link" && item.href && item.start <= caret && item.end >= caret
      );
      if (!mark?.href) return;
      event.preventDefault();
      window.open(mark.href, "_blank", "noopener,noreferrer");
    }

    function handleCopy(event: React.ClipboardEvent<HTMLDivElement>) {
      if (!selection) return;
      event.preventDefault();
      const numberedIndices = computeNumberedIndices(blocks);
      const lines = blocks
        .slice(selection.start, selection.end + 1)
        .map((block, offset) => blockToPlainText(block, numberedIndices[selection.start + offset]));
      event.clipboardData.setData("text/plain", lines.join("\n"));
    }

    function deleteSelection() {
      if (!selection) return;
      const { start, end } = selection;
      const replacement = createBlock("paragraph");
      const next = [...blocks.slice(0, start), replacement, ...blocks.slice(end + 1)];
      onChange(next);
      setSelection(null);
      focusBlock(replacement.id, "start");
    }

    const TEXT_STYLE_SHORTCUTS: Record<string, TextStyleKey> = { b: "bold", i: "italic", u: "underline" };

    function handleKeyDown(block: Block, event: React.KeyboardEvent<HTMLTextAreaElement>) {
      if ((event.metaKey || event.ctrlKey) && !event.altKey) {
        const style = TEXT_STYLE_SHORTCUTS[event.key.toLowerCase()];
        if (style) {
          event.preventDefault();
          handleToggleTextStyle(block, event.currentTarget, style);
          return;
        }
      }

      if (selection && (event.key === "Backspace" || event.key === "Delete")) {
        event.preventDefault();
        setHighlightSelection(null);
        deleteSelection();
        return;
      }

      if (event.key === "Escape" && highlightSelection && slashMenu?.blockId !== block.id) {
        setHighlightSelection(null);
        return;
      }

      if (slashMenu?.blockId === block.id) {
        const items = getFilteredCount(slashMenu.query);
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSlashMenu({ ...slashMenu, activeIndex: Math.min(slashMenu.activeIndex + 1, items - 1) });
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSlashMenu({ ...slashMenu, activeIndex: Math.max(slashMenu.activeIndex - 1, 0) });
          return;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          const item = getFilteredItem(slashMenu.query, slashMenu.activeIndex);
          if (item) handleSelectSlashType(item.type);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          closeSlashMenu();
          return;
        }
        return;
      }

      const textarea = event.currentTarget;
      const index = blocks.findIndex((b) => b.id === block.id);

      if (event.key === "Tab") {
        event.preventDefault();
        setHighlightSelection(null);
        const currentLevel = block.level ?? 0;
        if (event.shiftKey) {
          if (currentLevel > 0) {
            updateBlock(block.id, { level: currentLevel - 1 });
          }
        } else {
          const previous = blocks[index - 1];
          const previousLevel = previous ? previous.level ?? 0 : -1;
          if (previous && currentLevel <= previousLevel) {
            updateBlock(block.id, { level: Math.min(currentLevel + 1, MAX_BLOCK_INDENT_LEVEL) });
          }
        }
        return;
      }

      if (event.key === "Enter" && block.type === "code") {
        setHighlightSelection(null);
        if (!event.shiftKey) return;

        event.preventDefault();
        const before = block.text.slice(0, textarea.selectionStart);
        const after = block.text.slice(textarea.selectionEnd);
        const newBlock = createBlock("paragraph", after);
        const next = [...blocks];
        next.splice(index, 1, { ...block, text: before }, newBlock);
        onChange(next);
        focusBlock(newBlock.id, "end", newBlock.text);
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        setHighlightSelection(null);
        const before = block.text.slice(0, textarea.selectionStart);
        const after = block.text.slice(textarea.selectionEnd);

        if (LIST_BLOCK_TYPES.includes(block.type) && block.text === "") {
          updateBlock(block.id, { type: "paragraph", checked: undefined });
          return;
        }

        const beforeMarks = sliceMarks(block.marks ?? [], 0, textarea.selectionStart);
        const afterMarks = sliceMarks(block.marks ?? [], textarea.selectionEnd, Infinity);

        const nextType = LIST_BLOCK_TYPES.includes(block.type) ? block.type : "paragraph";
        const newBlock = {
          ...createBlock(nextType, after),
          level: block.level,
          marks: afterMarks.length ? afterMarks : undefined,
        };
        const next = [...blocks];
        next.splice(
          index,
          1,
          { ...block, text: before, marks: beforeMarks.length ? beforeMarks : undefined },
          newBlock
        );
        onChange(next);
        focusBlock(newBlock.id, "start");
        return;
      }

      if (event.key === "Backspace" && textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
        if (block.type !== "paragraph") {
          event.preventDefault();
          setHighlightSelection(null);
          updateBlock(block.id, { type: "paragraph", checked: undefined });
          return;
        }

        if (index === 0) {
          return;
        }

        event.preventDefault();
        setHighlightSelection(null);
        const previous = blocks[index - 1];

        if (previous.type === "divider") {
          const next = blocks.filter((b) => b.id !== previous.id);
          onChange(next);
          focusBlock(block.id, 0);
          return;
        }

        const mergedText = previous.text + block.text;
        const mergedMarks = mergeMarksForConcat(
          previous.marks ?? [],
          previous.text.length,
          block.marks ?? []
        );
        const next = blocks.filter((b) => b.id !== block.id);
        onChange(
          next.map((b) =>
            b.id === previous.id
              ? { ...b, text: mergedText, marks: mergedMarks.length ? mergedMarks : undefined }
              : b
          )
        );
        focusBlock(previous.id, previous.text.length);
        return;
      }

      if (event.key === "ArrowUp" && textarea.selectionStart === 0 && index > 0) {
        event.preventDefault();
        setHighlightSelection(null);
        focusBlock(blocks[index - 1].id, "end", blocks[index - 1].text);
        return;
      }

      if (
        event.key === "ArrowDown" &&
        textarea.selectionEnd === block.text.length &&
        index < blocks.length - 1
      ) {
        event.preventDefault();
        setHighlightSelection(null);
        focusBlock(blocks[index + 1].id, "start");
        return;
      }
    }

    function handlePaste(block: Block, event: React.ClipboardEvent<HTMLTextAreaElement>) {
      const text = event.clipboardData.getData("text/plain");
      if (!text || !text.includes("\n")) return;
      if (block.type === "code") {
        setHighlightSelection(null);
        return;
      }
      event.preventDefault();
      setHighlightSelection(null);

      const textarea = event.currentTarget;
      const before = block.text.slice(0, textarea.selectionStart);
      const after = block.text.slice(textarea.selectionEnd);
      const beforeMarks = sliceMarks(block.marks ?? [], 0, textarea.selectionStart);
      const afterMarks = sliceMarks(block.marks ?? [], textarea.selectionEnd, Infinity);

      const parsed = parsePastedText(text);
      if (parsed.some((item) => item.type === "table")) {
        const index = blocks.findIndex((b) => b.id === block.id);
        if (index === -1) return;
        const nextParsed = [
          ...(before ? [createBlock("paragraph", before)] : []),
          ...parsed,
          createBlock("paragraph", after),
        ];
        const next = [...blocks];
        next.splice(index, 1, ...nextParsed);
        onChange(next);
        focusBlock(nextParsed[nextParsed.length - 1].id, "start");
        return;
      }

      const lastIndex = parsed.length - 1;
      parsed[0] = {
        ...parsed[0],
        text: before + parsed[0].text,
        marks: beforeMarks.length ? beforeMarks : undefined,
      };
      const lastPastedText = parsed[lastIndex].text;
      const mergedTailMarks = mergeMarksForConcat(
        parsed[lastIndex].marks ?? [],
        lastPastedText.length,
        afterMarks
      );
      parsed[lastIndex] = {
        ...parsed[lastIndex],
        text: lastPastedText + after,
        marks: mergedTailMarks.length ? mergedTailMarks : undefined,
      };

      const index = blocks.findIndex((b) => b.id === block.id);
      if (index === -1) return;

      const next = [...blocks];
      next.splice(index, 1, ...parsed);
      onChange(next);
      focusBlock(parsed[lastIndex].id, parsed[lastIndex].text.length);
    }

    const numberedIndices = computeNumberedIndices(blocks);

    return (
      <div
        className={cn("flex flex-col gap-1", className)}
        onCopy={handleCopy}
        onMouseDownCapture={(event) => {
          if ((event.target as HTMLElement).tagName === "TEXTAREA") {
            if (selection) setSelection(null);
            setHighlightSelection(null);
          }
        }}
      >
        {blocks.map((block, index) => {
          const isSelected =
            selection !== null && index >= selection.start && index <= selection.end;
          return (
          <div
            key={block.id}
            id={`document-block-${block.id}`}
            ref={(el) => {
              if (el) rowRefs.current.set(block.id, el);
              else rowRefs.current.delete(block.id);
            }}
            style={{ marginLeft: (block.level ?? 0) * 24 }}
            className={cn(
              "relative scroll-mt-20 rounded-sm",
              reorderInsertIndex === index && "border-t-2 border-t-primary",
              draggingIndex === index && "opacity-40"
            )}
          >
            {isSelected && (
              <div
                className="pointer-events-none absolute inset-y-0 left-0 rounded-sm bg-blue-200/70 dark:bg-blue-500/30"
                style={{ width: highlightWidths[block.id] ?? "100%" }}
              />
            )}
            <BlockRenderer
              block={block}
              index={index}
              numberedIndex={numberedIndices[index]}
              documentId={documentId}
              placeholder={index === 0 || focusedBlockId === block.id ? placeholder : undefined}
              sublistHint={
                (index === 0 || focusedBlockId === block.id) &&
                sublistHintEnabled &&
                block.text === ""
                  ? { onInsert: () => insertChildPagesBlock(block.id) }
                  : undefined
              }
              activeSelection={
                highlightSelection?.blockId === block.id
                  ? { start: highlightSelection.start, end: highlightSelection.end }
                  : null
              }
              onTextChange={(value) => {
                if (selection) setSelection(null);
                handleTextChange(block, value);
              }}
              onCheckedChange={(checked) => updateBlock(block.id, { checked })}
              onImageChange={(imageSrc) => updateBlock(block.id, { imageSrc })}
              onTableUpdate={(patch) => updateBlock(block.id, patch)}
              onKeyDown={(event) => handleKeyDown(block, event)}
              onClick={(event) => handleLinkClick(block, event)}
              onPaste={(event) => handlePaste(block, event)}
              onFocus={() => setFocusedBlockId(block.id)}
              onBlur={() =>
                setFocusedBlockId((current) => (current === block.id ? null : current))
              }
              onAddBlockBelow={() => addBlockAfter(index)}
              onGutterMouseDown={(event) => handleGutterMouseDown(index, event)}
              onTextareaMouseDown={() => handleTextareaMouseDown(index)}
              onSelectionKeyUp={(event) => handleSelectionKeyUp(block, event)}
              onSelectionRectChange={(rect) =>
                setHighlightSelection((current) =>
                  current && current.blockId === block.id ? { ...current, rect } : current
                )
              }
              textareaRef={(el) => {
                if (el) textareaRefs.current.set(block.id, el);
                else textareaRefs.current.delete(block.id);
              }}
            />
          </div>
          );
        })}
        {reorderInsertIndex === blocks.length && <div className="h-0.5 rounded-full bg-primary" />}

        {highlightSelection?.rect && (
          <HighlightToolbar
            ref={highlightToolbarRef}
            rect={highlightSelection.rect}
            onPick={handleApplyHighlight}
            onLink={handleApplyLink}
            onToggleStyle={handleToolbarToggleTextStyle}
          />
        )}

        {slashMenu && (
          <SlashCommandMenu
            query={slashMenu.query}
            position={slashMenu.position}
            activeIndex={slashMenu.activeIndex}
            onActiveIndexChange={handleSlashActiveIndexChange}
            onSelect={handleSelectSlashType}
          />
        )}

        {turnIntoMenu && (
          <div ref={turnIntoMenuRef}>
            <SlashCommandMenu
              query=""
              position={turnIntoMenu.position}
              activeIndex={turnIntoMenu.activeIndex}
              onActiveIndexChange={handleTurnIntoActiveIndexChange}
              onSelect={(type) => handleTurnInto(turnIntoMenu.blockId, type)}
            />
          </div>
        )}

        {draggingIndex !== null && dragGhostPos && blocks[draggingIndex] && (
          <div
            className="pointer-events-none fixed z-50 max-w-sm truncate rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            style={{ left: dragGhostPos.x + 12, top: dragGhostPos.y + 8 }}
          >
            {blocks[draggingIndex].text || "Empty block"}
          </div>
        )}
      </div>
    );

    function getFilteredCount(query: string) {
      return filterSlashMenuItems(query, t).length;
    }

    function getFilteredItem(query: string, activeIndex: number) {
      return filterSlashMenuItems(query, t)[activeIndex];
    }
  }
);

DocumentBlockEditor.displayName = "DocumentBlockEditor";

export { createBlock };
export default DocumentBlockEditor;
