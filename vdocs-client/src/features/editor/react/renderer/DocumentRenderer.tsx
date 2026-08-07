"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { DragDropPlugin } from "../../features/drag-drop/DragDropPlugin";
import { useEditor } from "../EditorProvider";
import { BlockGutterControls } from "./BlockGutterControls";
import { BlockRenderer } from "./BlockRenderer";

interface BlockRange {
  start: number;
  end: number;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// Measures where the block's actual text sits (via a Range over its
// contentEditable content) instead of just using the block wrapper's full
// line width, so the highlight hugs the glyphs the way native text
// selection does rather than painting the whole line.
function measureBlockHighlightRects(
  wrapperEl: HTMLElement,
  containerEl: HTMLElement,
): HighlightRect[] {
  const editableEl = wrapperEl.querySelector<HTMLElement>("[contenteditable]");
  if (!editableEl) return [];

  const containerRect = containerEl.getBoundingClientRect();
  const domRange = window.document.createRange();
  domRange.selectNodeContents(editableEl);
  const rects = Array.from(domRange.getClientRects());

  if (rects.length === 0) {
    const editableRect = editableEl.getBoundingClientRect();
    return [
      {
        top: editableRect.top - containerRect.top,
        left: editableRect.left - containerRect.left,
        width: 6,
        height: editableRect.height,
      },
    ];
  }

  return rects.map((rect) => ({
    top: rect.top - containerRect.top,
    left: rect.left - containerRect.left,
    width: rect.width,
    height: rect.height,
  }));
}

// Each block renders its own isolated contentEditable (see EditableText), so
// the browser's native Selection/Range can never span more than one block —
// dragging across block boundaries just collapses/restarts native selection.
// This tracks the drag ourselves and paints a full-block highlight overlay
// for every block between the mousedown block and the block under the
// pointer, which is what makes the drag "feel" like it selects multiple
// lines the way a single-contentEditable editor would.
function getBlockIndexFromEvent(event: { target: EventTarget | null }): number | null {
  const target = event.target as HTMLElement | null;
  const blockEl = target?.closest<HTMLElement>("[data-block-index]");
  if (!blockEl) return null;
  const index = Number(blockEl.dataset.blockIndex);
  return Number.isNaN(index) ? null : index;
}

export function DocumentRenderer() {
  const { state, deleteBlockRange, fullWidth, moveBlock } = useEditor();
  const [range, setRange] = useState<BlockRange | null>(null);
  const [highlightRectsByIndex, setHighlightRectsByIndex] = useState<
    Record<number, HighlightRect[]>
  >({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dragAnchorRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  // Block reordering via the gutter's "⋮⋮" handle, using native HTML5 drag
  // events rather than a library — the handle itself is `draggable`, and
  // each block wrapper below is the drop target.
  const draggingBlockIdRef = useRef<string | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);

  const handleGutterDragStart = (blockId: string) => (event: React.DragEvent) => {
    draggingBlockIdRef.current = blockId;
    event.dataTransfer.effectAllowed = "move";
  };

  const handleGutterDragEnd = () => {
    draggingBlockIdRef.current = null;
    setDropIndicatorIndex(null);
  };

  const handleBlockDragOver = (index: number) => (event: React.DragEvent) => {
    if (!draggingBlockIdRef.current) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const isAfter = event.clientY - rect.top > rect.height / 2;
    setDropIndicatorIndex(isAfter ? index + 1 : index);
  };

  const handleBlockDrop = (event: React.DragEvent) => {
    const blockId = draggingBlockIdRef.current;
    draggingBlockIdRef.current = null;
    if (blockId === null || dropIndicatorIndex === null) return;
    event.preventDefault();
    moveBlock(blockId, dropIndicatorIndex);
    setDropIndicatorIndex(null);
  };

  // The block-gutter menu (Turn into / Duplicate / Delete) needs to know
  // whether the block it was opened on is part of the current drag-highlight
  // range, so an action taken there applies to the whole selection instead
  // of just the one block whose gutter happened to be clicked.
  const selectedBlockIds = range
    ? state.document.blocks.slice(range.start, range.end + 1).map((block) => block.id)
    : [];

  useLayoutEffect(() => {
    if (!range || !containerRef.current) {
      setHighlightRectsByIndex({});
      return;
    }

    const containerEl = containerRef.current;
    const next: Record<number, HighlightRect[]> = {};

    for (let index = range.start; index <= range.end; index += 1) {
      const wrapperEl = containerEl.querySelector<HTMLElement>(
        `[data-block-index="${index}"]`,
      );
      if (!wrapperEl) continue;
      next[index] = measureBlockHighlightRects(wrapperEl, containerEl);
    }

    setHighlightRectsByIndex(next);
  }, [range, state.document]);

  useEffect(() => {
    const handleWindowMouseUp = () => {
      isDraggingRef.current = false;
      dragAnchorRef.current = null;
    };
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => window.removeEventListener("mouseup", handleWindowMouseUp);
  }, []);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    // The block-gutter controls (add-block "+", "⋮⋮" menu trigger) sit inside
    // each block wrapper, so their mousedown bubbles up here too — without
    // this guard, opening the menu clears whatever multi-block selection the
    // menu action was meant to apply to.
    if ((event.target as HTMLElement).closest("[data-block-gutter]")) return;

    const index = getBlockIndexFromEvent(event);
    if (index === null) return;

    isDraggingRef.current = true;
    dragAnchorRef.current = index;
    setRange(null);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || dragAnchorRef.current === null) return;
    const index = getBlockIndexFromEvent(event);
    if (index === null) return;

    if (index === dragAnchorRef.current) {
      setRange(null);
      return;
    }

    // Once the drag crosses into a second block, take over selection entirely.
    window.getSelection()?.removeAllRanges();
    setRange({
      start: Math.min(dragAnchorRef.current, index),
      end: Math.max(dragAnchorRef.current, index),
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    dragAnchorRef.current = null;
  };

  // Native copy reads window.getSelection(), which handleMouseMove clears
  // once the drag spans multiple blocks (see comment above). Without this,
  // Ctrl+C copies nothing for a multi-block selection, so we intercept the
  // copy event and populate the clipboard ourselves from the tracked range.
  const handleCopy = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (!range) return;
    const text = state.document.blocks
      .slice(range.start, range.end + 1)
      .map((block) => block.text)
      .join("\n");
    event.preventDefault();
    event.clipboardData.setData("text/plain", text);
  };

  // Same problem as copy: once a drag spans multiple blocks, native selection
  // is cleared (see handleMouseMove) so each block's own Backspace/Delete
  // handler never sees a selection to act on. Intercept here using the
  // tracked range instead.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!range) return;
    if (event.key !== "Backspace" && event.key !== "Delete") return;

    event.preventDefault();
    deleteBlockRange(range.start, range.end);
    setRange(null);
  };

  return (
    <DragDropPlugin>
      <div
        ref={containerRef}
        className={cn(
          "relative mx-auto flex w-full flex-col py-4",
          fullWidth ? "max-w-none px-12" : "max-w-3xl px-24",
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onCopy={handleCopy}
        onKeyDown={handleKeyDown}
      >
        {state.document.blocks.map((block, index) => (
          <div
            key={`${block.id}-${index}`}
            data-block-index={index}
            className="group relative min-w-0"
            onDragOver={handleBlockDragOver(index)}
            onDrop={handleBlockDrop}
          >
            {dropIndicatorIndex === index && (
              <div className="pointer-events-none absolute -top-0.5 left-0 right-0 h-0.5 rounded bg-primary" />
            )}
            <BlockGutterControls
              block={block}
              selectedBlockIds={selectedBlockIds}
              onHandleDragStart={handleGutterDragStart(block.id)}
              onHandleDragEnd={handleGutterDragEnd}
            />
            <BlockRenderer block={block} isFirst={index === 0} />
            {dropIndicatorIndex === index + 1 && index === state.document.blocks.length - 1 && (
              <div className="pointer-events-none absolute -bottom-0.5 left-0 right-0 h-0.5 rounded bg-primary" />
            )}
          </div>
        ))}
        {Object.entries(highlightRectsByIndex).flatMap(([index, rects]) =>
          rects.map((rect, rectIndex) => (
            <div
              key={`${index}-${rectIndex}`}
              className="pointer-events-none absolute z-20 bg-blue-400/25"
              style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
            />
          )),
        )}
      </div>
    </DragDropPlugin>
  );
}
