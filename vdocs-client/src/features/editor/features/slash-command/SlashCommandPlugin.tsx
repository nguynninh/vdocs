"use client";

import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { SlashCommandMenu } from "./SlashCommandMenu";
import type { SlashCommandMenuHandle } from "./SlashCommandMenu";
import type { SlashCommandItem } from "./slashCommand.types";

export interface SlashCommandAnchor {
  top: number;
  bottom: number;
  left: number;
}

export interface SlashCommandPluginHandle {
  open: (anchor: SlashCommandAnchor) => void;
  close: () => void;
  isOpen: () => boolean;
  setQuery: (query: string) => void;
  handleKeyDown: (event: React.KeyboardEvent) => boolean;
}

export interface SlashCommandPluginProps {
  onSelectCommand: (item: SlashCommandItem) => void;
}

const GAP = 4;

export const SlashCommandPlugin = forwardRef<SlashCommandPluginHandle, SlashCommandPluginProps>(
  function SlashCommandPlugin({ onSelectCommand }, ref) {
    const [anchor, setAnchor] = useState<SlashCommandAnchor | null>(null);
    const [style, setStyle] = useState<React.CSSProperties | null>(null);
    const menuRef = useRef<SlashCommandMenuHandle>(null);

    const close = useCallback(() => {
      setAnchor(null);
      setStyle(null);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        open: (nextAnchor) => setAnchor(nextAnchor),
        close,
        isOpen: () => anchor !== null,
        setQuery: (query) => menuRef.current?.setQuery(query),
        handleKeyDown: (event) => {
          if (anchor === null) return false;
          menuRef.current?.handleKeyDown(event);
          return true;
        },
      }),
      [close, anchor],
    );

    useLayoutEffect(() => {
      if (!anchor || !menuRef.current?.element) return;

      const menuHeight = menuRef.current.element.offsetHeight;
      const spaceBelow = window.innerHeight - anchor.bottom;
      const shouldFlipUp = spaceBelow < menuHeight + GAP && anchor.top > menuHeight + GAP;

      setStyle({
        position: "fixed",
        top: shouldFlipUp ? anchor.top - menuHeight - GAP : anchor.bottom + GAP,
        left: anchor.left,
        zIndex: 50,
      });
    }, [anchor]);

    if (anchor === null || typeof document === "undefined") return null;

    return createPortal(
      <SlashCommandMenu
        ref={menuRef}
        style={style ?? { position: "fixed", top: anchor.bottom + GAP, left: anchor.left, zIndex: 50, visibility: "hidden" }}
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
