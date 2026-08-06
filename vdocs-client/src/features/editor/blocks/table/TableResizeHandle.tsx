"use client";

import { useRef } from "react";

const MIN_SIZE = 30;

export interface ColumnResizeHandleProps {
  startWidth: number;
  onResize: (nextWidth: number) => void;
}

// Thin absolutely-positioned strip on a column's right edge (or a row's
// bottom edge, see RowResizeHandle) — plain mousedown/mousemove/mouseup drag
// tracking against window listeners, no pointer-capture/touch support needed
// for this pass.
export function ColumnResizeHandle({ startWidth, onResize }: ColumnResizeHandleProps) {
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
      className="absolute right-[-3px] top-0 z-10 h-full w-[6px] cursor-col-resize select-none hover:bg-blue-400/50"
    />
  );
}

export interface RowResizeHandleProps {
  startHeight: number;
  onResize: (nextHeight: number) => void;
}

export function RowResizeHandle({ startHeight, onResize }: RowResizeHandleProps) {
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
      className="absolute bottom-[-3px] left-0 z-10 h-[6px] w-full cursor-row-resize select-none hover:bg-blue-400/50"
    />
  );
}
