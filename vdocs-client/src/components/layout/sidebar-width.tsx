"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const SIDEBAR_WIDTH_STORAGE_KEY = "sidebar_width";
const SIDEBAR_WIDTH_DEFAULT = 256;
const SIDEBAR_WIDTH_MIN = 200;
const SIDEBAR_WIDTH_MAX = 420;

function clampWidth(value: number) {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, value));
}

interface SidebarWidthContextValue {
  width: number;
  isResizing: boolean;
  setWidth: (width: number) => void;
  commitWidth: (width: number) => void;
  setIsResizing: (value: boolean) => void;
}

const SidebarWidthContext = createContext<SidebarWidthContextValue | null>(null);

export function SidebarWidthProvider({ children }: { children: ReactNode }) {
  const [width, setWidthState] = useState(() => {
    if (typeof window === "undefined") return SIDEBAR_WIDTH_DEFAULT;

    const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    return stored ? clampWidth(stored) : SIDEBAR_WIDTH_DEFAULT;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Only updates in-memory state while dragging; localStorage is written once via commitWidth.
  const setWidth = useCallback((value: number) => {
    setWidthState(clampWidth(value));
  }, []);

  const commitWidth = useCallback((value: number) => {
    const clamped = clampWidth(value);
    setWidthState(clamped);
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clamped));
  }, []);

  return (
    <SidebarWidthContext.Provider value={{ width, isResizing, setWidth, commitWidth, setIsResizing }}>
      {children}
    </SidebarWidthContext.Provider>
  );
}

export function useSidebarWidth() {
  const context = useContext(SidebarWidthContext);
  if (!context) {
    throw new Error("useSidebarWidth must be used within a SidebarWidthProvider.");
  }
  return context;
}
