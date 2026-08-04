"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { buildSegments, HIGHLIGHT_COLOR_VAR } from "./richtext";
import type { HighlightMark } from "./types";

interface HighlightOverlayProps {
  text: string;
  marks?: HighlightMark[];
  className?: string;
  showText?: boolean;
  activeSelection?: { start: number; end: number } | null;
  onSelectionRectChange?: (rect: DOMRect | null) => void;
}

/**
 * Read-only layer painted behind the block's real `<textarea>`. Plain blocks keep
 * this text transparent; marked blocks can show this layer so individual spans can
 * carry inline styling that a textarea cannot render.
 */
function HighlightOverlay({
  text,
  marks,
  className,
  showText = false,
  activeSelection,
  onSelectionRectChange,
}: HighlightOverlayProps) {
  const selectionRef = React.useRef<HTMLSpanElement>(null);
  const segments = React.useMemo(
    () => buildSegments(text, marks, activeSelection),
    [text, marks, activeSelection]
  );

  const selectionStart = activeSelection?.start;
  const selectionEnd = activeSelection?.end;

  // Depend only on the primitive selection bounds (and text/marks layout inputs),
  // never on `activeSelection`/`onSelectionRectChange` object identity — those are
  // recreated on every parent render, which would otherwise re-fire this effect
  // every time and, since it reports back into the parent's state, loop forever.
  React.useLayoutEffect(() => {
    if (!onSelectionRectChange) return;
    if (selectionStart === undefined || selectionEnd === undefined || selectionEnd <= selectionStart) {
      onSelectionRectChange(null);
      return;
    }
    const rects = selectionRef.current?.getClientRects();
    onSelectionRectChange(rects && rects.length > 0 ? rects[0] : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionStart, selectionEnd, text, marks]);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0 select-none whitespace-pre-wrap break-words",
        showText ? "text-foreground" : "text-transparent",
        className
      )}
    >
      {segments.map((segment) => (
        <span
          key={`${segment.start}-${segment.end}`}
          ref={segment.isSelection ? selectionRef : undefined}
          className={cn(
            segment.color === "link"
              ? "text-blue-600 underline decoration-blue-600 underline-offset-2 dark:text-blue-400 dark:decoration-blue-400"
              : segment.color && "rounded-[2px]",
            segment.bold && "font-bold",
            segment.italic && "italic",
            segment.underline && segment.color !== "link" && "underline underline-offset-2"
          )}
          style={
            segment.color && segment.color !== "link"
              ? {
                  backgroundColor: HIGHLIGHT_COLOR_VAR[segment.color],
                  boxShadow:
                    segment.color === "code"
                      ? "inset 0 0 0 1px var(--inline-code-border)"
                      : undefined,
                  WebkitBoxDecorationBreak: "clone",
                  boxDecorationBreak: "clone",
                }
              : undefined
          }
        >
          {segment.text || "​"}
        </span>
      ))}
    </div>
  );
}

export default HighlightOverlay;
