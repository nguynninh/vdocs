"use client";

import { useRef } from "react";

import { computeResizedWidth } from "./image.resize";

export interface ImageResizeHandleProps {
  currentWidth: number;
  onResize: (width: number) => void;
  side: "left" | "right";
}

export function ImageResizeHandle({ currentWidth, onResize, side }: ImageResizeHandleProps) {
  const startXRef = useRef(0);
  const startWidthRef = useRef(currentWidth);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    startXRef.current = event.clientX;
    startWidthRef.current = currentWidth;

    const handleMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startXRef.current;
      const signedDelta = side === "left" ? -delta : delta;
      onResize(computeResizedWidth(startWidthRef.current, signedDelta * 2));
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className={`absolute top-1/2 z-10 h-10 w-1.5 -translate-y-1/2 cursor-ew-resize rounded-full bg-primary/70 opacity-0 transition-opacity group-hover:opacity-100 ${
        side === "left" ? "left-1" : "right-1"
      }`}
    />
  );
}
