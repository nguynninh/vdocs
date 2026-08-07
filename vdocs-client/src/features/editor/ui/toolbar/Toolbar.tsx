"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Highlighter,
} from "lucide-react";

import { useEditor } from "../../react/EditorProvider";
import { getTextOffset } from "../../react/editable/renderMarkedText";
import { isMarkActive } from "../../engine/query/isMarkActive";
import type { MarkType } from "../../engine/mark/mark.types";

interface Selection {
  blockId: string;
  node: HTMLElement;
  start: number;
  end: number;
  rect: DOMRect;
}

const HIGHLIGHT_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff"];

/** Reads the current DOM selection and, if it's a non-collapsed range fully inside
 * a single `[data-block-id]` contentEditable, returns its block-relative text offsets. */
function readSingleBlockSelection(): Selection | null {
  const domSelection = window.getSelection();
  if (!domSelection || domSelection.rangeCount === 0 || domSelection.isCollapsed) return null;

  const anchorNode = domSelection.anchorNode;
  const focusNode = domSelection.focusNode;
  if (!anchorNode || !focusNode) return null;

  const anchorBlock = (anchorNode instanceof Element ? anchorNode : anchorNode.parentElement)?.closest<HTMLElement>(
    "[data-block-id]",
  );
  const focusBlock = (focusNode instanceof Element ? focusNode : focusNode.parentElement)?.closest<HTMLElement>(
    "[data-block-id]",
  );
  if (!anchorBlock || !focusBlock || anchorBlock !== focusBlock) return null;

  const blockId = anchorBlock.getAttribute("data-block-id");
  if (!blockId) return null;

  const start = Math.min(
    getTextOffset(anchorBlock, domSelection.anchorNode!, domSelection.anchorOffset),
    getTextOffset(anchorBlock, domSelection.focusNode!, domSelection.focusOffset),
  );
  const end = Math.max(
    getTextOffset(anchorBlock, domSelection.anchorNode!, domSelection.anchorOffset),
    getTextOffset(anchorBlock, domSelection.focusNode!, domSelection.focusOffset),
  );
  if (start === end) return null;

  const rect = domSelection.getRangeAt(0).getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  return { blockId, node: anchorBlock, start, end, rect };
}

export function Toolbar() {
  const { state, canEdit, toggleMark, applyMark, removeMark } = useEditor();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [highlightPickerOpen, setHighlightPickerOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);

  const refreshSelection = useCallback(() => {
    // Focus inside the toolbar itself (e.g. the link-URL input, which
    // autofocuses and triggers this same selectionchange) must not close the
    // popover it belongs to or clear the selection driving it.
    if (toolbarRef.current?.contains(document.activeElement)) return;

    setLinkEditorOpen(false);
    setHighlightPickerOpen(false);

    if (!canEdit) {
      setSelection(null);
      return;
    }

    setSelection(readSingleBlockSelection());
  }, [canEdit]);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshSelection);
    window.addEventListener("scroll", refreshSelection, true);
    window.addEventListener("resize", refreshSelection);
    return () => {
      document.removeEventListener("selectionchange", refreshSelection);
      window.removeEventListener("scroll", refreshSelection, true);
      window.removeEventListener("resize", refreshSelection);
    };
  }, [refreshSelection]);

  if (!selection || typeof document === "undefined") return null;

  const block = state.document.blocks.find((candidate) => candidate.id === selection.blockId);
  const marks = block?.marks ?? [];
  const isActive = (type: MarkType) => isMarkActive(marks, type, selection.start, selection.end);

  const handleToggle = (type: Exclude<MarkType, "link" | "highlight">) => {
    toggleMark(selection.blockId, selection.start, selection.end, type);
  };

  const openLinkEditor = () => {
    const existing = marks.find(
      (mark) => mark.type === "link" && mark.start <= selection.start && mark.end >= selection.end,
    );
    setLinkValue(existing?.data?.href ?? "");
    setHighlightPickerOpen(false);
    setLinkEditorOpen(true);
  };

  const submitLink = () => {
    const href = linkValue.trim();
    if (href) {
      applyMark(selection.blockId, selection.start, selection.end, "link", { href });
    } else {
      removeMark(selection.blockId, selection.start, selection.end, "link");
    }
    setLinkEditorOpen(false);
  };

  const pickHighlight = (color: string | null) => {
    if (color) {
      applyMark(selection.blockId, selection.start, selection.end, "highlight", { color });
    } else {
      removeMark(selection.blockId, selection.start, selection.end, "highlight");
    }
    setHighlightPickerOpen(false);
  };

  const top = selection.rect.top - 8;
  const left = selection.rect.left + selection.rect.width / 2;

  return createPortal(
    <div
      ref={toolbarRef}
      style={{ position: "fixed", top, left, transform: "translate(-50%, -100%)", zIndex: 50 }}
      className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
      onMouseDown={(event) => event.preventDefault()}
    >
      <ToolbarButton active={isActive("bold")} label="Bold" onClick={() => handleToggle("bold")}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={isActive("italic")} label="Italic" onClick={() => handleToggle("italic")}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={isActive("underline")} label="Underline" onClick={() => handleToggle("underline")}>
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={isActive("strikethrough")}
        label="Strikethrough"
        onClick={() => handleToggle("strikethrough")}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={isActive("code")} label="Code" onClick={() => handleToggle("code")}>
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <div className="relative">
        <ToolbarButton active={isActive("link")} label="Link" onClick={openLinkEditor}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        {linkEditorOpen && (
          <div className="absolute left-1/2 top-full mt-1 flex w-56 -translate-x-1/2 items-center gap-1 rounded-md border border-border bg-popover p-1 shadow-lg">
            <input
              autoFocus
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitLink();
                }
                if (event.key === "Escape") setLinkEditorOpen(false);
              }}
              placeholder="https://..."
              className="w-full bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}
      </div>

      <div className="relative">
        <ToolbarButton
          active={isActive("highlight")}
          label="Highlight"
          onClick={() => {
            setLinkEditorOpen(false);
            setHighlightPickerOpen((open) => !open);
          }}
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>
        {highlightPickerOpen && (
          <div className="absolute left-1/2 top-full mt-1 flex -translate-x-1/2 items-center gap-1 rounded-md border border-border bg-popover p-1.5 shadow-lg">
            <button
              type="button"
              onClick={() => pickHighlight(null)}
              className="h-5 w-5 rounded-full border border-border"
              title="None"
            />
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => pickHighlight(color)}
                style={{ backgroundColor: color }}
                className="h-5 w-5 rounded-full"
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted ${
        active ? "bg-muted text-foreground" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
