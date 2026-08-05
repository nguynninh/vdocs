"use client";

import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { createPortal } from "react-dom";

import { SlashCommandMenu } from "./SlashCommandMenu";
import type { SlashCommandItem } from "./slashCommand.types";

export interface SlashCommandPluginHandle {
  open: (position: { top: number; left: number }) => void;
  close: () => void;
}

export interface SlashCommandPluginProps {
  onSelectCommand: (item: SlashCommandItem) => void;
}

export const SlashCommandPlugin = forwardRef<SlashCommandPluginHandle, SlashCommandPluginProps>(
  function SlashCommandPlugin({ onSelectCommand }, ref) {
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
      <SlashCommandMenu
        style={{ position: "fixed", top: position.top, left: position.left, zIndex: 50 }}
        onSelect={(item) => {
          onSelectCommand(item);
          close();
        }}
        onClose={close}
      />,
      document.body,
    );
  },
);
