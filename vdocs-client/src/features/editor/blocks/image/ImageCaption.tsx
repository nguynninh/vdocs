"use client";

import { useState } from "react";

export interface ImageCaptionProps {
  caption?: string;
  canEdit: boolean;
  onChange: (caption: string) => void;
}

export function ImageCaption({ caption, canEdit, onChange }: ImageCaptionProps) {
  const [value, setValue] = useState(caption ?? "");

  if (!canEdit && !caption) return null;

  return (
    <input
      type="text"
      value={value}
      disabled={!canEdit}
      placeholder="Add a caption…"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        if (value !== (caption ?? "")) onChange(value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className="mt-1.5 w-full bg-transparent text-center text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/70 disabled:cursor-default"
    />
  );
}
