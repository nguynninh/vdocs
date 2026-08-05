import type { ReactNode } from "react";

export interface EditorContentProps {
  children?: ReactNode;
}

export function EditorContent({ children }: EditorContentProps) {
  return <div className="flex flex-1 flex-col overflow-auto">{children}</div>;
}
