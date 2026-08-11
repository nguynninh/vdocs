"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  CircleX,
  Copy,
  Download,
  File as FileIcon,
  PaintRoller,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { documentApi, resolveFileUrl } from "../../data/api/documentApi";
import type { BlockNode, BlockType, FileData } from "../../engine/block/block.types";
import type { MarkRange } from "../../engine/mark/mark.types";
import { matchInlineCode } from "../../features/markdown-shortcuts/inlineCode";
import { mapSlashCommandToBlockType } from "../../features/slash-command/mapSlashCommandToBlockType";
import { SlashCommandPlugin } from "../../features/slash-command/SlashCommandPlugin";
import type { SlashCommandPluginHandle } from "../../features/slash-command/SlashCommandPlugin";
import { renderMarkedText } from "../../react/editable/renderMarkedText";
import { useEditor } from "../../react/EditorProvider";

export interface TableViewProps {
  block: BlockNode;
  isFirst: boolean;
}

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

interface TableMenuState {
  row: number;
  col: number;
  top: number;
  left: number;
}

interface ColumnMenuState {
  col: number;
  top: number;
  left: number;
}

interface RowMenuState {
  row: number;
  col: number;
  top: number;
  left: number;
}

const TEXT_COLORS = [
  { label: "Default text", color: null },
  { label: "Gray text", color: "#9B9A97" },
  { label: "Brown text", color: "#64473A" },
  { label: "Orange text", color: "#D9730D" },
  { label: "Yellow text", color: "#DFAB01" },
  { label: "Green text", color: "#0F7B6C" },
  { label: "Blue text", color: "#0B6E99" },
  { label: "Purple text", color: "#6940A5" },
  { label: "Pink text", color: "#AD1A72" },
  { label: "Red text", color: "#E03E3E" },
];

const BACKGROUND_COLORS = [
  { label: "Default background", color: null },
  { label: "Gray background", color: "#EBECED" },
  { label: "Brown background", color: "#E9E5E3" },
  { label: "Orange background", color: "#FAEBDD" },
  { label: "Yellow background", color: "#FBF3DB" },
  { label: "Green background", color: "#DDEDEA" },
  { label: "Blue background", color: "#DDEBF1" },
  { label: "Purple background", color: "#EAE4F2" },
  { label: "Pink background", color: "#F4DFEB" },
  { label: "Red background", color: "#FBE4E4" },
];

function TableHandle({
  side,
  selected,
  onClick,
}: {
  side: "top" | "left" | "right";
  selected?: boolean;
  onClick?: (rect: DOMRect) => void;
}) {
  const isTop = side === "top";
  const position =
    side === "top"
      ? "top-[-8px] left-1/2 -translate-x-1/2"
      : side === "left"
        ? "top-1/2 left-[-8px] -translate-y-1/2"
        : "top-1/2 right-[-8px] -translate-y-1/2";

  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`group/handle pointer-events-auto absolute z-20 flex h-5 w-5 items-center justify-center ${position}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        if (!onClick) return;
        event.stopPropagation();
        onClick(event.currentTarget.getBoundingClientRect());
      }}
    >
      <span
        className={
          isTop
            ? `h-[3px] w-5 ${selected ? "hidden bg-[#2f80ed]" : "bg-[#9ca3af] group-hover/handle:hidden"}`
            : `h-5 w-[3px] ${selected ? "hidden bg-[#2f80ed]" : "bg-[#9ca3af] group-hover/handle:hidden"}`
        }
      />
      <span
        className={`${selected ? "flex" : "hidden group-hover/handle:flex"} items-center justify-center rounded border shadow-sm ${
          selected ? "border-[#2f80ed] bg-[#2f80ed]" : "border-[#cfd4dc] bg-white"
        } ${
          isTop ? "h-3.5 w-5" : "h-5 w-3.5"
        }`}
      >
        <span className={isTop ? "grid grid-cols-3 gap-[2px]" : "grid grid-cols-2 gap-[2px]"}>
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} className={`size-[2px] rounded-full ${selected ? "bg-white" : "bg-[#9ca3af]"}`} />
          ))}
        </span>
      </span>
    </Tag>
  );
}

function getColorMenuLayout(menuTop: number, menuLeft: number, parentWidth = 224) {
  const colorMenuWidth = 224;
  const top = Math.max(8, Math.min(menuTop - 5, window.innerHeight - 240));
  const left =
    menuLeft + parentWidth + colorMenuWidth + 8 <= window.innerWidth
      ? menuLeft + parentWidth
      : Math.max(8, menuLeft - colorMenuWidth);
  const maxHeight = Math.max(180, window.innerHeight - top - 8);

  return { top, left, maxHeight };
}

function TableCellMenu({
  menu,
  onClose,
  onColor,
  onClear,
}: {
  menu: TableMenuState | null;
  onClose: () => void;
  onColor: (row: number, col: number, type: "textColor" | "highlight", color: string | null) => void;
  onClear: (row: number, col: number) => void;
}) {
  useEffect(() => {
    if (!menu) return;

    const close = () => onClose();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu, onClose]);

  if (!menu || typeof document === "undefined") return null;

  const colorMenu = getColorMenuLayout(menu.top, menu.left);

  return createPortal(
    <div
      className="fixed z-50 w-56 rounded-lg border border-[#e1e4e8] bg-white p-1 text-sm text-[#1f2937] shadow-lg"
      style={{ top: menu.top, left: menu.left }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="group/color relative">
        <button
          type="button"
          className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-[#f7f7f5]"
        >
          <PaintRoller className="size-4 text-[#4b5563]" />
          <span className="flex-1">Color</span>
          <ChevronRight className="size-4 text-[#6b7280]" />
        </button>
        <div
          className="fixed hidden w-56 overflow-y-auto rounded-lg border border-[#e1e4e8] bg-white p-2 shadow-lg group-hover/color:block"
          style={{ top: colorMenu.top, left: colorMenu.left, maxHeight: colorMenu.maxHeight }}
        >
          <div className="px-1.5 pb-1 text-xs text-[#6b7280]">Text color</div>
          {TEXT_COLORS.map((item) => (
            <ColorMenuItem
              key={item.label}
              label={item.label}
              color={item.color}
              type="text"
              onClick={() => {
                onColor(menu.row, menu.col, "textColor", item.color);
                onClose();
              }}
            />
          ))}
          <div className="my-2 border-t border-[#eeeeec]" />
          <div className="px-1.5 pb-1 text-xs text-[#6b7280]">Background color</div>
          {BACKGROUND_COLORS.map((item) => (
            <ColorMenuItem
              key={item.label}
              label={item.label}
              color={item.color}
              type="background"
              onClick={() => {
                onColor(menu.row, menu.col, "highlight", item.color);
                onClose();
              }}
            />
          ))}
        </div>
      </div>
      <button
        type="button"
        className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-[#f7f7f5]"
        onClick={() => {
          onClear(menu.row, menu.col);
          onClose();
        }}
      >
        <CircleX className="size-4 text-[#4b5563]" />
        <span>Clear contents</span>
      </button>
    </div>,
    document.body,
  );
}

function TableColumnMenu({
  menu,
  onClose,
  onColor,
  onInsertLeft,
  onInsertRight,
  onDuplicate,
  onClear,
  onDelete,
}: {
  menu: ColumnMenuState | null;
  onClose: () => void;
  onColor: (col: number, type: "textColor" | "highlight", color: string | null) => void;
  onInsertLeft: (col: number) => void;
  onInsertRight: (col: number) => void;
  onDuplicate: (col: number) => void;
  onClear: (col: number) => void;
  onDelete: (col: number) => void;
}) {
  useEffect(() => {
    if (!menu) return;

    const close = () => onClose();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu, onClose]);

  if (!menu || typeof document === "undefined") return null;

  const colorMenu = getColorMenuLayout(menu.top + 32, menu.left, 208);
  const run = (action: (col: number) => void) => {
    action(menu.col);
    onClose();
  };

  return createPortal(
    <div
      className="fixed z-50 w-52 rounded-lg border border-[#e1e4e8] bg-white p-2 text-sm text-[#1f2937] shadow-lg"
      style={{ top: menu.top, left: menu.left }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <input
        autoFocus
        placeholder="Search actions..."
        className="mb-2 h-7 w-full rounded border border-[#2f80ed] px-2 text-xs outline-none"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      />
      <div className="group/color relative">
        <ColumnMenuButton icon={<PaintRoller className="size-4" />} label="Color" trailing={<ChevronRight className="size-4" />} />
        <div
          className="fixed hidden w-56 overflow-y-auto rounded-lg border border-[#e1e4e8] bg-white p-2 shadow-lg group-hover/color:block"
          style={{ top: colorMenu.top, left: colorMenu.left, maxHeight: colorMenu.maxHeight }}
        >
          <div className="px-1.5 pb-1 text-xs text-[#6b7280]">Text color</div>
          {TEXT_COLORS.map((item) => (
            <ColorMenuItem
              key={item.label}
              label={item.label}
              color={item.color}
              type="text"
              onClick={() => {
                onColor(menu.col, "textColor", item.color);
                onClose();
              }}
            />
          ))}
          <div className="my-2 border-t border-[#eeeeec]" />
          <div className="px-1.5 pb-1 text-xs text-[#6b7280]">Background color</div>
          {BACKGROUND_COLORS.map((item) => (
            <ColorMenuItem
              key={item.label}
              label={item.label}
              color={item.color}
              type="background"
              onClick={() => {
                onColor(menu.col, "highlight", item.color);
                onClose();
              }}
            />
          ))}
        </div>
      </div>
      <ColumnMenuButton icon={<ArrowLeft className="size-4" />} label="Insert left" onClick={() => run(onInsertLeft)} />
      <ColumnMenuButton icon={<ArrowRight className="size-4" />} label="Insert right" onClick={() => run(onInsertRight)} />
      <ColumnMenuButton icon={<Copy className="size-4" />} label="Duplicate" trailing={<span className="text-xs text-[#9ca3af]">⌘D</span>} onClick={() => run(onDuplicate)} />
      <ColumnMenuButton icon={<CircleX className="size-4" />} label="Clear contents" onClick={() => run(onClear)} />
      <ColumnMenuButton icon={<Trash2 className="size-4" />} label="Delete" onClick={() => run(onDelete)} />
    </div>,
    document.body,
  );
}

function TableRowMenu({
  menu,
  onClose,
  onColor,
  onInsertAbove,
  onInsertBelow,
  onDuplicate,
  onClear,
  onDelete,
}: {
  menu: RowMenuState | null;
  onClose: () => void;
  onColor: (row: number, type: "textColor" | "highlight", color: string | null) => void;
  onInsertAbove: (row: number) => void;
  onInsertBelow: (row: number) => void;
  onDuplicate: (row: number) => void;
  onClear: (row: number) => void;
  onDelete: (row: number) => void;
}) {
  useEffect(() => {
    if (!menu) return;

    const close = () => onClose();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu, onClose]);

  if (!menu || typeof document === "undefined") return null;

  const colorMenu = getColorMenuLayout(menu.top + 32, menu.left, 208);
  const run = (action: (row: number) => void) => {
    action(menu.row);
    onClose();
  };

  return createPortal(
    <div
      className="fixed z-50 w-52 rounded-lg border border-[#e1e4e8] bg-white p-2 text-sm text-[#1f2937] shadow-lg"
      style={{ top: menu.top, left: menu.left }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <input
        autoFocus
        placeholder="Search actions..."
        className="mb-2 h-7 w-full rounded border border-[#2f80ed] px-2 text-xs outline-none"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      />
      <div className="group/color relative">
        <ColumnMenuButton icon={<PaintRoller className="size-4" />} label="Color" trailing={<ChevronRight className="size-4" />} />
        <div
          className="fixed hidden w-56 overflow-y-auto rounded-lg border border-[#e1e4e8] bg-white p-2 shadow-lg group-hover/color:block"
          style={{ top: colorMenu.top, left: colorMenu.left, maxHeight: colorMenu.maxHeight }}
        >
          <div className="px-1.5 pb-1 text-xs text-[#6b7280]">Text color</div>
          {TEXT_COLORS.map((item) => (
            <ColorMenuItem
              key={item.label}
              label={item.label}
              color={item.color}
              type="text"
              onClick={() => {
                onColor(menu.row, "textColor", item.color);
                onClose();
              }}
            />
          ))}
          <div className="my-2 border-t border-[#eeeeec]" />
          <div className="px-1.5 pb-1 text-xs text-[#6b7280]">Background color</div>
          {BACKGROUND_COLORS.map((item) => (
            <ColorMenuItem
              key={item.label}
              label={item.label}
              color={item.color}
              type="background"
              onClick={() => {
                onColor(menu.row, "highlight", item.color);
                onClose();
              }}
            />
          ))}
        </div>
      </div>
      <ColumnMenuButton icon={<ArrowUp className="size-4" />} label="Insert above" onClick={() => run(onInsertAbove)} />
      <ColumnMenuButton icon={<ArrowDown className="size-4" />} label="Insert below" onClick={() => run(onInsertBelow)} />
      <ColumnMenuButton icon={<Copy className="size-4" />} label="Duplicate" trailing={<span className="text-xs text-[#9ca3af]">⌘D</span>} onClick={() => run(onDuplicate)} />
      <ColumnMenuButton icon={<CircleX className="size-4" />} label="Clear contents" onClick={() => run(onClear)} />
      <ColumnMenuButton icon={<Trash2 className="size-4" />} label="Delete" onClick={() => run(onDelete)} />
      <div className="mt-2 border-t border-[#eeeeec] pt-1 text-xs text-[#9ca3af]">
        <div>Last edited by Nguyễn Ninh</div>
        <div>Today at 2:29 PM</div>
      </div>
    </div>,
    document.body,
  );
}

function ColumnMenuButton({
  icon,
  label,
  trailing,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="flex h-7 w-full items-center gap-2 rounded-md px-1.5 text-left hover:bg-[#f7f7f5]"
      onClick={onClick}
    >
      <span className="text-[#4b5563]">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}

function ColorMenuItem({
  label,
  color,
  type,
  onClick,
}: {
  label: string;
  color: string | null;
  type: "text" | "background";
  onClick: () => void;
}) {
  return (
    <button type="button" className="flex h-7 w-full items-center gap-2 rounded-md px-1.5 text-left hover:bg-[#f7f7f5]" onClick={onClick}>
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded border border-[#e5e7eb] text-sm"
        style={type === "background" && color ? { backgroundColor: color } : undefined}
      >
        {type === "text" && <span style={color ? { color } : undefined}>A</span>}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
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
        className="min-h-7 h-full px-3 py-1 text-sm outline-none"
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
    applyTableCellMark,
    removeTableCellMark,
    setTableCellFile,
    insertTableColumn,
    insertTableRow,
    clearTableColumn,
    duplicateTableColumn,
    deleteTableColumn,
    clearTableRow,
    duplicateTableRow,
    deleteTableRow,
    insertBlockAfterFocused,
    canEdit,
  } = useEditor();
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const [menu, setMenu] = useState<TableMenuState | null>(null);
  const [columnMenu, setColumnMenu] = useState<ColumnMenuState | null>(null);
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null);
  const rows = block.table?.rows ?? [];
  const cellMarks = block.table?.cellMarks ?? [];
  const cellFiles = block.table?.cellFiles ?? [];

  if (rows.length === 0) {
    return null;
  }

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

  const clearCell = (row: number, col: number) => {
    const length = rows[row]?.[col]?.length ?? 0;
    removeTableCellMark(block.id, row, col, 0, length, "textColor");
    removeTableCellMark(block.id, row, col, 0, length, "highlight");
    updateTableCell(block.id, row, col, "");
    setTableCellFile(block.id, row, col, null);
  };

  const colorCell = (row: number, col: number, type: "textColor" | "highlight", color: string | null) => {
    const length = rows[row]?.[col]?.length ?? 0;
    if (color) {
      applyTableCellMark(block.id, row, col, 0, length, type, { color });
      return;
    }
    removeTableCellMark(block.id, row, col, 0, length, type);
  };

  const colorColumn = (col: number, type: "textColor" | "highlight", color: string | null) => {
    rows.forEach((row, rowIndex) => {
      const length = row[col]?.length ?? 0;
      if (color) {
        applyTableCellMark(block.id, rowIndex, col, 0, length, type, { color });
        return;
      }
      removeTableCellMark(block.id, rowIndex, col, 0, length, type);
    });
  };

  const colorRow = (row: number, type: "textColor" | "highlight", color: string | null) => {
    rows[row]?.forEach((cell, colIndex) => {
      const length = cell.length;
      if (color) {
        applyTableCellMark(block.id, row, colIndex, 0, length, type, { color });
        return;
      }
      removeTableCellMark(block.id, row, colIndex, 0, length, type);
    });
  };

  return (
    <div className="my-1 overflow-x-auto px-2 pt-2">
      <TableCellMenu menu={menu} onClose={() => setMenu(null)} onColor={colorCell} onClear={clearCell} />
      <TableColumnMenu
        menu={columnMenu}
        onClose={() => setColumnMenu(null)}
        onColor={colorColumn}
        onInsertLeft={(col) => insertTableColumn(block.id, col)}
        onInsertRight={(col) => insertTableColumn(block.id, col + 1)}
        onDuplicate={(col) => duplicateTableColumn(block.id, col)}
        onClear={(col) => clearTableColumn(block.id, col)}
        onDelete={(col) => deleteTableColumn(block.id, col)}
      />
      <TableRowMenu
        menu={rowMenu}
        onClose={() => setRowMenu(null)}
        onColor={colorRow}
        onInsertAbove={(row) => insertTableRow(block.id, row)}
        onInsertBelow={(row) => insertTableRow(block.id, row + 1)}
        onDuplicate={(row) => duplicateTableRow(block.id, row)}
        onClear={(row) => clearTableRow(block.id, row)}
        onDelete={(row) => deleteTableRow(block.id, row)}
      />
      <table className="w-full table-fixed border-collapse border border-[#e1e4e8]">
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex}>
              {cells.map((cellText, colIndex) => {
                const isMenuCell = menu?.row === rowIndex && menu.col === colIndex;
                const isFocusedCell = focusedCell?.row === rowIndex && focusedCell.col === colIndex;
                const isColumnSelected = columnMenu?.col === colIndex;
                const isRowSelected = rowMenu?.row === rowIndex;
                const isTopHandle =
                  (activeCell?.col === colIndex ||
                    focusedCell?.col === colIndex ||
                    menu?.col === colIndex ||
                    rowMenu?.col === colIndex ||
                    isColumnSelected) &&
                  rowIndex === 0;
                const isLeftHandle =
                  (activeCell?.row === rowIndex || menu?.row === rowIndex || isRowSelected) && colIndex === 0;
                const isRightHandle = isFocusedCell || isMenuCell;
                const selectedColumnClass = isColumnSelected
                  ? `${rowIndex === 0 ? "border-t-[#2f80ed]" : ""} ${
                      rowIndex === rows.length - 1 ? "border-b-[#2f80ed]" : ""
                    } border-x-[#2f80ed] bg-[#eaf2ff]/70`
                  : "";
                const selectedRowClass = isRowSelected
                  ? `${colIndex === 0 ? "border-l-[#2f80ed]" : ""} ${
                      colIndex === cells.length - 1 ? "border-r-[#2f80ed]" : ""
                    } border-y-[#2f80ed] bg-[#eaf2ff]/70`
                  : "";

                return (
                  <td
                    key={colIndex}
                    className={`relative min-w-28 border border-[#e1e4e8] p-0 align-top focus-within:z-10 focus-within:outline-2 focus-within:outline-offset-[-1px] focus-within:outline-[#2f80ed] ${selectedColumnClass} ${selectedRowClass}`}
                    onMouseEnter={() => setActiveCell({ row: rowIndex, col: colIndex })}
                    onMouseLeave={() => {
                      if (!menu && !columnMenu && !rowMenu) setActiveCell(null);
                    }}
                    onFocus={() => {
                      setActiveCell({ row: rowIndex, col: colIndex });
                      setFocusedCell({ row: rowIndex, col: colIndex });
                    }}
                    onBlur={(event) => {
                      if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
                        return;
                      }
                      if (!menu && !columnMenu && !rowMenu) setFocusedCell(null);
                    }}
                  >
                    {isTopHandle && (
                      <TableHandle
                        side="top"
                        selected={isColumnSelected}
                        onClick={
                          canEdit
                            ? (rect) => {
                                setMenu(null);
                                setRowMenu(null);
                                setColumnMenu({
                                  col: colIndex,
                                  top: rect.bottom + 4,
                                  left: Math.max(4, Math.min(rect.left, window.innerWidth - 432)),
                                });
                              }
                            : undefined
                        }
                      />
                    )}
                    {isLeftHandle && (
                      <TableHandle
                        side="left"
                        selected={isRowSelected}
                        onClick={
                          canEdit
                            ? (rect) => {
                                setMenu(null);
                                setColumnMenu(null);
                                setRowMenu({
                                  row: rowIndex,
                                  col: colIndex,
                                  top: Math.max(8, Math.min(rect.top, window.innerHeight - 280)),
                                  left: Math.max(4, Math.min(rect.left + 12, window.innerWidth - 216)),
                                });
                              }
                            : undefined
                        }
                      />
                    )}
                    {isRightHandle && canEdit && (
                      <TableHandle
                        side="right"
                        onClick={(rect) => {
                          setColumnMenu(null);
                          setRowMenu(null);
                          setMenu({
                            row: rowIndex,
                            col: colIndex,
                            top: rect.bottom + 4,
                            left: Math.max(4, Math.min(rect.left, window.innerWidth - 456)),
                          });
                        }}
                      />
                    )}
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
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
