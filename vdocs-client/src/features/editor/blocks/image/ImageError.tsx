"use client";

import { AlertCircle } from "lucide-react";

export interface ImageErrorProps {
  message: string;
  onRetry?: () => void;
}

export function ImageError({ message, onRetry }: ImageErrorProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
      <AlertCircle className="size-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="text-xs font-medium underline">
          Try again
        </button>
      ) : null}
    </div>
  );
}
