"use client";

import { AlignCenter, AlignLeft, StretchHorizontal } from "lucide-react";

import type { ImageAlignment } from "../../engine/block/block.types";

export interface ImageAlignmentMenuProps {
  align: ImageAlignment;
  onChange: (align: ImageAlignment) => void;
}

const OPTIONS: { value: ImageAlignment; label: string; icon: typeof AlignLeft }[] = [
  { value: "left", label: "Align left", icon: AlignLeft },
  { value: "center", label: "Align center", icon: AlignCenter },
  { value: "full", label: "Full width", icon: StretchHorizontal },
];

export function ImageAlignmentMenu({ align, onChange }: ImageAlignmentMenuProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-popover p-0.5 shadow-sm">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          title={label}
          onClick={() => onChange(value)}
          className={`rounded p-1 ${
            align === value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
