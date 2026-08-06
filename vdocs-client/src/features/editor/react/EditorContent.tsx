import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { FontStyle } from "../engine/document/document.types";
import { useEditor } from "./EditorProvider";

export interface EditorContentProps {
  children?: ReactNode;
}

const FONT_STYLE_CLASS_NAMES: Record<FontStyle, string> = {
  default: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

export function EditorContent({ children }: EditorContentProps) {
  const { fontStyle } = useEditor();

  return (
    <div className={cn("flex flex-1 flex-col overflow-auto", FONT_STYLE_CLASS_NAMES[fontStyle])}>
      {children}
    </div>
  );
}
