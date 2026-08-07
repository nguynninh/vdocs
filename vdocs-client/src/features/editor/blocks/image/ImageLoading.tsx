"use client";

export interface ImageLoadingProps {
  percent: number;
  filename?: string;
}

export function ImageLoading({ percent, filename }: ImageLoadingProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 px-3 py-3">
      <div className="truncate text-xs text-muted-foreground">
        Uploading{filename ? ` ${filename}` : ""}…
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
