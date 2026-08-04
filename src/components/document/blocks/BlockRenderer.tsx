"use client";

import * as React from "react";
import { GripVertical, ImagePlus, ListTree, Plus } from "lucide-react";

import AutoGrowTextarea from "@/components/common/AutoGrowTextarea";
import { useLocale } from "@/components/layout/locale-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import ChildPagesBlock from "./ChildPagesBlock";
import HighlightOverlay from "./HighlightOverlay";
import TableBlock from "./TableBlock";
import type { Block } from "./types";

const TEXT_SIZE_BY_TYPE: Partial<Record<Block["type"], string>> = {
  heading1: "py-0.5 text-3xl leading-tight font-semibold",
  heading2: "py-0.5 text-2xl leading-tight font-semibold",
  heading3: "py-0.5 text-xl leading-tight font-semibold",
  code: "font-mono text-sm leading-6",
};

interface BlockRendererProps {
  block: Block;
  index: number;
  numberedIndex: number | null;
  documentId: string;
  placeholder?: string;
  sublistHint?: { onInsert: () => void };
  activeSelection?: { start: number; end: number } | null;
  onTextChange: (value: string) => void;
  onCheckedChange: (checked: boolean) => void;
  onImageChange: (imageSrc: string | undefined) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onClick: (event: React.MouseEvent<HTMLTextAreaElement>) => void;
  onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  textareaRef: (element: HTMLTextAreaElement | null) => void;
  onAddBlockBelow: () => void;
  onGutterMouseDown: (event: React.MouseEvent<HTMLSpanElement>) => void;
  onTextareaMouseDown: () => void;
  onSelectionKeyUp: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSelectionRectChange: (rect: DOMRect | null) => void;
  onTableUpdate: (
    patch: Partial<
      Pick<
        Block,
        | "table"
        | "tableHeaderRow"
        | "tableRowColors"
        | "tableColColors"
        | "tableColWidths"
        | "tableRowHeights"
      >
    >
  ) => void;
}

function BlockRenderer({
  block,
  numberedIndex,
  documentId,
  placeholder,
  sublistHint,
  activeSelection,
  onTextChange,
  onCheckedChange,
  onImageChange,
  onKeyDown,
  onClick,
  onPaste,
  onFocus,
  onBlur,
  textareaRef,
  onAddBlockBelow,
  onGutterMouseDown,
  onTextareaMouseDown,
  onSelectionKeyUp,
  onSelectionRectChange,
  onTableUpdate,
}: BlockRendererProps) {
  const { t } = useLocale();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [urlDraft, setUrlDraft] = React.useState("");

    const gutter = (
      <div className="absolute right-full top-0 mr-2 flex h-6 shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
        <button
          type="button"
          tabIndex={-1}
          onClick={onAddBlockBelow}
          className="flex size-5 items-center justify-center rounded-none text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-4" />
        </button>
        <span
          onMouseDown={onGutterMouseDown}
          className="group/grip relative flex size-5 cursor-grab items-center justify-center rounded-none text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 hidden -translate-x-1/2 flex-col items-center whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-center shadow-md group-hover/grip:flex dark:bg-neutral-700">
            <span className="text-xs font-medium text-white">Drag to move</span>
            <span className="text-[11px] text-neutral-300">Click or ⌘/ to open menu</span>
          </span>
        </span>
      </div>
    );

    if (block.type === "childPages") {
      return (
        <div className="group relative flex items-start gap-2">
          {gutter}
          <ChildPagesBlock documentId={documentId} />
        </div>
      );
    }

    if (block.type === "divider") {
      return (
        <div className="group relative flex items-start">
          {gutter}
          <hr className="my-2 w-full border-t border-border" />
        </div>
      );
    }

    if (block.type === "table") {
      return (
        <div className="group relative">
          {gutter}
          <TableBlock
            table={block.table ?? []}
            headerRow={block.tableHeaderRow !== false}
            rowColors={block.tableRowColors}
            colColors={block.tableColColors}
            colWidths={block.tableColWidths}
            rowHeights={block.tableRowHeights}
            onUpdate={onTableUpdate}
          />
        </div>
      );
    }

    if (block.type === "image") {
      if (block.imageSrc) {
        return (
          <div className="group relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.imageSrc}
              alt=""
              className="max-h-[480px] w-full rounded-none object-contain"
            />
            <button
              type="button"
              onClick={() => onImageChange(undefined)}
              className="absolute right-2 top-2 hidden rounded-none bg-background/80 px-2 py-1 text-xs text-foreground shadow ring-1 ring-foreground/10 group-hover:block"
            >
              {t("document.body.image.remove")}
            </button>
          </div>
        );
      }

      return (
        <div className="flex flex-col gap-2 rounded-none border border-dashed border-border p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-none bg-muted px-2.5 py-1.5 text-xs text-foreground hover:bg-muted/80"
            >
              <ImagePlus className="size-4" />
              {t("document.body.image.upload")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImageChange(URL.createObjectURL(file));
              }}
            />
          </div>
          <input
            type="text"
            value={urlDraft}
            onChange={(event) => setUrlDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && urlDraft.trim()) {
                event.preventDefault();
                onImageChange(urlDraft.trim());
              }
            }}
            placeholder={t("document.body.image.urlPlaceholder")}
            className="w-full rounded-none border-0 border-t border-border bg-transparent pt-2 text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>
      );
    }

    const prefix =
      block.type === "numbered" ? (
        <span className="flex h-6 w-6 shrink-0 select-none items-center justify-end pr-0.5 text-sm text-muted-foreground tabular-nums">
          {numberedIndex}.
        </span>
      ) : block.type === "bulleted" ? (
        <span className="flex h-6 w-6 shrink-0 select-none items-center justify-center text-sm text-muted-foreground">
          •
        </span>
      ) : block.type === "todo" ? (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
          <Checkbox
            checked={block.checked ?? false}
            onCheckedChange={(checked) => onCheckedChange(checked === true)}
          />
        </div>
      ) : null;

    return (
      <div
        className={cn(
          "group relative flex items-start gap-2",
          block.type === "quote" && "border-l-2 border-foreground/30 pl-3",
          block.type === "code" &&
            "rounded-md border border-border bg-slate-50 px-3 py-2 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/40 dark:bg-neutral-900"
        )}
      >
        {gutter}
        {prefix}
        <div className="relative w-full">
          <HighlightOverlay
            text={block.text}
            marks={block.marks}
            showText={!!block.marks?.length}
            activeSelection={activeSelection}
            onSelectionRectChange={onSelectionRectChange}
            className={cn(
              "text-base",
              TEXT_SIZE_BY_TYPE[block.type],
              block.type === "quote" && "italic"
            )}
          />
          <AutoGrowTextarea
            ref={textareaRef}
            value={block.text}
            onValueChange={onTextChange}
            onKeyDown={onKeyDown}
            onClick={onClick}
            onKeyUp={onSelectionKeyUp}
            onPaste={onPaste}
            onFocus={onFocus}
            onBlur={onBlur}
            onMouseDown={onTextareaMouseDown}
            placeholder={sublistHint ? undefined : placeholder}
            className={cn(
              "relative z-10 text-base text-foreground placeholder:text-muted-foreground/60",
              TEXT_SIZE_BY_TYPE[block.type],
              !!block.marks?.length && "text-transparent caret-foreground",
              block.type === "quote" && "italic",
              block.type === "code" && "whitespace-pre-wrap break-words",
              block.type === "todo" && block.checked && "text-muted-foreground line-through"
            )}
          />
          {sublistHint && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center gap-1 whitespace-nowrap text-base text-muted-foreground/60">
              <span>{t("document.body.placeholderPrefix")}</span>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(event) => {
                  event.preventDefault();
                  sublistHint.onInsert();
                }}
                className="pointer-events-auto inline-flex items-center gap-1 rounded-none underline decoration-dotted underline-offset-2 hover:text-foreground"
              >
                <ListTree className="size-3.5" />
                {t("document.body.placeholderSublistAction")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
}

export default BlockRenderer;
