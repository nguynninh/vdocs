"use client";

import { useRef } from "react";

const MIN_SIZE = 30;

export interface ColumnResizeHandleProps {
  left: number;
  startWidth: number;
  onResize: (nextWidth: number) => void;
}

// Thin absolutely-positioned strip spanning the full table height on a
// column's right edge (or the full table width on a row's bottom edge, see
// RowResizeHandle), positioned against the table wrapper rather than a
// single cell so the drag/hover indicator runs the whole length of the
// boundary instead of just one row/column tall. Plain mousedown/mousemove/
// mouseup drag tracking against window listeners, no pointer-capture/touch
// support needed for this pass.
export function ColumnResizeHandle({ left, startWidth, onResize }: ColumnResizeHandleProps) {
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragState.current = { startX: event.clientX, startWidth };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragState.current) return;
      const delta = moveEvent.clientX - dragState.current.startX;
      const nextWidth = Math.max(MIN_SIZE, dragState.current.startWidth + delta);
      onResize(nextWidth);
    };

    const handleMouseUp = () => {
      dragState.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={handleMouseDown}
      style={{ left: `${left - 3}px` }}
      className="absolute top-0 z-10 h-full w-[6px] cursor-col-resize select-none hover:bg-blue-400/50"
    />
  );
}

export interface RowResizeHandleProps {
  top: number;
  startHeight: number;
  onResize: (nextHeight: number) => void;
}

export function RowResizeHandle({ top, startHeight, onResize }: RowResizeHandleProps) {
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragState.current = { startY: event.clientY, startHeight };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragState.current) return;
      const delta = moveEvent.clientY - dragState.current.startY;
      const nextHeight = Math.max(MIN_SIZE, dragState.current.startHeight + delta);
      onResize(nextHeight);
    };

    const handleMouseUp = () => {
      dragState.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      onMouseDown={handleMouseDown}
      style={{ top: `${top - 3}px` }}
      className="absolute left-0 z-10 h-[6px] w-full cursor-row-resize select-none hover:bg-blue-400/50"
    />
  );
}
