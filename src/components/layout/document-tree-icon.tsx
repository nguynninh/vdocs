import { FileText, Folder } from "lucide-react";

import type { DocumentSummaryResponse } from "@/types/document";

const COLOR_CLASSES: Record<string, string> = {
  orange: "text-orange-500",
  green: "text-emerald-500",
  gray: "text-neutral-400",
  red: "text-red-500",
  blue: "text-blue-500",
  amber: "text-amber-500",
  pink: "text-pink-500",
  violet: "text-violet-500",
};

const COLOR_PALETTE = ["orange", "green", "gray", "red", "blue", "amber", "violet", "pink"] as const;

export function paletteColorFor(index: number) {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

interface DocumentTreeIconProps {
  document: Pick<DocumentSummaryResponse, "icon" | "color" | "type">;
  index?: number;
  className?: string;
}

// Older records stored a bare keyword (e.g. "folder", "code", "user") instead of
// an actual glyph; only render `icon` directly when it isn't one of those keys.
const KEYWORD_ICON = /^[a-z0-9_-]+$/i;

export default function DocumentTreeIcon({ document, index = 0, className = "h-4 w-4" }: DocumentTreeIconProps) {
  const hasCustomGlyph = Boolean(document.icon) && !KEYWORD_ICON.test(document.icon as string);

  if (hasCustomGlyph) {
    return (
      <span className={`flex shrink-0 items-center justify-center leading-none ${className}`} aria-hidden>
        {document.icon}
      </span>
    );
  }

  if (document.type === "SPACE") {
    const color = COLOR_CLASSES[document.color ?? paletteColorFor(index)] ?? COLOR_CLASSES.blue;
    return <Folder className={`shrink-0 ${className} ${color}`} strokeWidth={2} />;
  }

  return <FileText className={`shrink-0 ${className} text-neutral-400 dark:text-neutral-500`} />;
}
