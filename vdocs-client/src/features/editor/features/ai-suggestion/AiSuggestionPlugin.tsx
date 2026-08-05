"use client";

import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { createPortal } from "react-dom";

import { AiSuggestionMenu } from "./AiSuggestionMenu";
import type { AiSuggestionItem } from "./aiSuggestion.types";

export interface AiSuggestionPluginHandle {
  open: (position: { top: number; left: number }) => void;
  close: () => void;
}

export interface AiSuggestionPluginProps {
  onSelectSuggestion: (item: AiSuggestionItem) => void;
}

export const AiSuggestionPlugin = forwardRef<AiSuggestionPluginHandle, AiSuggestionPluginProps>(
  function AiSuggestionPlugin({ onSelectSuggestion }, ref) {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    const close = useCallback(() => setPosition(null), []);

    useImperativeHandle(
      ref,
      () => ({
        open: (nextPosition) => setPosition(nextPosition),
        close,
      }),
      [close],
    );

    if (position === null || typeof document === "undefined") return null;

    return createPortal(
      <AiSuggestionMenu
        style={{ position: "fixed", top: position.top, left: position.left, zIndex: 50 }}
        onSelect={(item) => {
          onSelectSuggestion(item);
          close();
        }}
        onClose={close}
      />,
      document.body,
    );
  },
);
