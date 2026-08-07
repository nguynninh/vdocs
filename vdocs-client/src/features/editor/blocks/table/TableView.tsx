"use client";

import { Download, File as FileIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { documentApi, resolveFileUrl } from "../../data/api/documentApi";
import type { BlockNode, BlockType, FileData } from "../../engine/block/block.types";
import type { MarkRange } from "../../engine/mark/mark.types";
import { matchInlineCode } from "../../features/markdown-shortcuts/inlineCode";
import { mapSlashCommandToBlockType } from "../../features/slash-command/mapSlashCommandToBlockType";
import { SlashCommandPlugin } from "../../features/slash-command/SlashCommandPlugin";
import type { SlashCommandPluginHandle } from "../../features/slash-command/SlashCommandPlugin";
import { renderMarkedText } from "../../react/editable/renderMarkedText";
import { useEditor } from "../../react/EditorProvider";
import { ColumnResizeHandle, RowResizeHandle } from "./TableResizeHandle";

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface TableViewProps {
  block: BlockNode;
  isFirst: boolean;
}

const DEFAULT_COLUMN_WIDTH = 160;
const DEFAULT_ROW_HEIGHT = 40;

interface TableCellEditableProps {
  blockId: string;
  documentId: string;
  row: number;
  col: number;
  text: string;
  marks?: MarkRange[];
  file?: FileData | null;
  canEdit: boolean;
  onChange: (row: number, col: number, text: string) => void;
  onExit: () => void;
  onInsertBlockAfterTable: (blockType: BlockType) => void;
  onSetFile: (row: number, col: number, file: FileData | null) => void;
}

// Mirrors EditableText's contentEditable pattern (uncontrolled DOM node kept
// in sync via textContent, rather than a controlled React input) so cell
// editing behaves the same way as every other in-place text edit in the
// editor, just scoped to a single cell instead of a whole block.
function TableCellEditable({
  blockId,
  documentId,
  row,
  col,
  text,
  marks,
  file,
  canEdit,
  onChange,
  onExit,
  onInsertBlockAfterTable,
  onSetFile,
}: TableCellEditableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const marksSignatureRef = useRef<string>("");
  const slashCommandRef = useRef<SlashCommandPluginHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const marksSignature = JSON.stringify(marks ?? []);
    if (node.textContent === text && marksSignatureRef.current === marksSignature) return;
    marksSignatureRef.current = marksSignature;

    renderMarkedText(node, text, marks);

    if (window.document.activeElement !== node) return;

    const range = window.document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [text, marks]);

  const syncSlashCommandMenu = (nextText: string) => {
    // Mirrors EditableText.syncSlashCommandMenu — the "/" filter stays typed
    // straight into the cell, same as any other block.
    if (!nextText.startsWith("/") || nextText.includes(" ")) {
      slashCommandRef.current?.close();
      return;
    }

    const query = nextText.slice(1);

    if (slashCommandRef.current?.isOpen()) {
      slashCommandRef.current.setQuery(query);
      return;
    }

    const selection = window.getSelection();
    const rect = selection?.rangeCount ? selection.getRangeAt(0).getBoundingClientRect() : null;
    if (!rect) return;

    slashCommandRef.current?.open({ top: rect.top, bottom: rect.bottom, left: rect.left });
    slashCommandRef.current?.setQuery(query);
  };

  const handleFileChosen = async (chosen: File) => {
    setIsUploading(true);
    try {
      const { data } = await documentApi.uploadFile(documentId, chosen);
      onSetFile(row, col, {
        id: data.id,
        filename: data.filename,
        mimeType: data.mimeType,
        size: data.size,
        url: data.url,
      });
      setShowFilePicker(false);
    } finally {
      setIsUploading(false);
    }
  };

  if (file) {
    return (
      <div className="group relative flex h-full items-center gap-2 px-3 py-2">
        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
        <a
          href={resolveFileUrl(file.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate text-sm hover:underline"
          title={file.filename}
        >
          {file.filename}
        </a>
        {canEdit && (
          <button
            type="button"
            onClick={() => onSetFile(row, col, null)}
            className="shrink-0 text-xs text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
            title="Remove file"
          >
            ✕
          </button>
        )}
        <Download className="size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </div>
    );
  }

  if (showFilePicker) {
    return (
      <div className="flex h-full items-center gap-2 px-3 py-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          disabled={isUploading}
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            if (chosen) handleFileChosen(chosen);
          }}
        />
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-60"
        >
          {isUploading ? "Uploading…" : "Choose a file"}
        </button>
        <button
          type="button"
          onClick={() => setShowFilePicker(false)}
          className="text-xs text-muted-foreground hover:underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={ref}
        contentEditable={canEdit}
        suppressContentEditableWarning
        className="h-full min-w-[6rem] px-3 py-2 text-sm outline-none focus:bg-accent/40"
        data-table-cell={`${blockId}:${row}:${col}`}
        onInput={(event) => {
          const nextText = event.currentTarget.textContent ?? "";
          onChange(row, col, nextText);
          syncSlashCommandMenu(nextText);
        }}
        onKeyDown={(event) => {
          if (
            (event.key === "ArrowUp" ||
              event.key === "ArrowDown" ||
              event.key === "Enter" ||
              event.key === "Escape") &&
            slashCommandRef.current?.handleKeyDown(event)
          ) {
            return;
          }

          if (event.key === "Enter" && event.shiftKey) {
            event.preventDefault();
            onExit();
          }
        }}
      />
      <SlashCommandPlugin
        ref={slashCommandRef}
        onSelectCommand={(item) => {
          onChange(row, col, "");
          if (ref.current) ref.current.textContent = "";

          if (item.id === "file") {
            setShowFilePicker(true);
            return;
          }

          const nextBlockType = mapSlashCommandToBlockType(item.id);
          if (nextBlockType) {
            onInsertBlockAfterTable(nextBlockType);
            return;
          }
          ref.current?.focus();
        }}
      />
    </div>
  );
}

export function TableView({ block }: TableViewProps) {
  const {
    documentId,
    updateTableCell,
    toggleTableCellMark,
    updateTableColumnWidth,
    updateTableRowHeight,
    setTableCellFile,
    insertBlockAfterFocused,
    canEdit,
  } = useEditor();
  const rows = block.table?.rows ?? [];
  const cellMarks = block.table?.cellMarks ?? [];
  const columnWidths = block.table?.columnWidths ?? [];
  const rowHeights = block.table?.rowHeights ?? [];
  const cellFiles = block.table?.cellFiles ?? [];

  if (rows.length === 0) {
    return null;
  }

  const columnCount = rows[0]?.length ?? 0;

  const onCellChange = (row: number, col: number, text: string) => {
    const inlineCode = matchInlineCode(text);
    if (inlineCode) {
      const { start, matchLength, content } = inlineCode;
      const nextText = text.slice(0, start) + content + text.slice(start + matchLength);
      updateTableCell(block.id, row, col, nextText);
      toggleTableCellMark(block.id, row, col, start, start + content.length, "code");
      return;
    }
    updateTableCell(block.id, row, col, text);
  };

  return (
    <div className="my-1 overflow-x-auto">
      <table className="table-fixed border-collapse border border-border">
        <colgroup>
          {Array.from({ length: columnCount }, (_, colIndex) => (
            <col key={colIndex} style={{ width: `${columnWidths[colIndex] ?? DEFAULT_COLUMN_WIDTH}px` }} />
          ))}
        </colgroup>
        <tbody>
          {rows.map((cells, rowIndex) => {
            const rowHeight = rowHeights[rowIndex] ?? DEFAULT_ROW_HEIGHT;
            return (
              <tr key={rowIndex} className="border border-border" style={{ height: `${rowHeight}px` }}>
                {cells.map((cellText, colIndex) => (
                  <td key={colIndex} className="relative border border-border p-0 align-top">
                    <TableCellEditable
                      blockId={block.id}
                      documentId={documentId}
                      row={rowIndex}
                      col={colIndex}
                      text={cellText}
                      marks={cellMarks[rowIndex]?.[colIndex]}
                      file={cellFiles[rowIndex]?.[colIndex]}
                      canEdit={canEdit}
                      onChange={onCellChange}
                      onExit={() => insertBlockAfterFocused(block.id, "paragraph")}
                      onInsertBlockAfterTable={(blockType) => insertBlockAfterFocused(block.id, blockType)}
                      onSetFile={(row, col, file) => setTableCellFile(block.id, row, col, file)}
                    />
                    {canEdit && rowIndex === 0 && (
                      <ColumnResizeHandle
                        startWidth={columnWidths[colIndex] ?? DEFAULT_COLUMN_WIDTH}
                        onResize={(nextWidth) => updateTableColumnWidth(block.id, colIndex, nextWidth)}
                      />
                    )}
                    {canEdit && colIndex === 0 && (
                      <RowResizeHandle
                        startHeight={rowHeight}
                        onResize={(nextHeight) => updateTableRowHeight(block.id, rowIndex, nextHeight)}
                      />
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
