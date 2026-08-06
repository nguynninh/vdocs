"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import type { BlockType } from "../../engine/block/block.types";
import { useEditor } from "../EditorProvider";

const HEADING_TYPES: BlockType[] = ["heading1", "heading2", "heading3"];

// h1 draws the widest dash, h3 the narrowest — mirrors nesting depth the way
// a document outline would.
const DASH_WIDTH_BY_TYPE: Record<string, number> = {
  heading1: 20,
  heading2: 14,
  heading3: 9,
};

function scrollToBlock(index: number) {
  const el = document.querySelector<HTMLElement>(`[data-block-index="${index}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HeadingMinimap() {
  const { state } = useEditor();
  const [isHovering, setIsHovering] = useState(false);

  const headings = state.document.blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => HEADING_TYPES.includes(block.type));

  if (headings.length === 0) return null;

  return (
    <div
      className="fixed right-4 top-1/2 z-30 flex -translate-y-1/2 items-center"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {isHovering && (
        <div className="mr-2 max-h-[70vh] w-64 overflow-y-auto rounded-lg border bg-popover p-2 shadow-lg">
          <ul className="flex flex-col gap-0.5">
            {headings.map(({ block, index }) => (
              <li key={block.id}>
                <button
                  type="button"
                  onClick={() => scrollToBlock(index)}
                  className={cn(
                    "block w-full truncate rounded px-2 py-1 text-left text-sm text-popover-foreground hover:bg-accent",
                    block.type === "heading1" && "font-semibold",
                    block.type === "heading2" && "pl-4",
                    block.type === "heading3" && "pl-6 text-xs",
                  )}
                >
                  {block.text || "Untitled"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col items-end gap-1.5">
        {headings.map(({ block, index }) => (
          <button
            key={block.id}
            type="button"
            aria-label={block.text || "Untitled heading"}
            onClick={() => scrollToBlock(index)}
            className="h-0.5 rounded-full bg-muted-foreground/40 transition-colors hover:bg-primary"
            style={{ width: DASH_WIDTH_BY_TYPE[block.type] }}
          />
        ))}
      </div>
    </div>
  );
}
