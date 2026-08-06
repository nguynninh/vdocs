"use client";

import { useEffect, useRef } from "react";

import type { BlockNode } from "../../engine/block/block.types";
import type { MarkRange } from "../../engine/mark/mark.types";
import { matchInlineCode } from "../../features/markdown-shortcuts/inlineCode";
import { renderMarkedText } from "../../react/editable/renderMarkedText";
import { useEditor } from "../../react/EditorProvider";
import { ColumnResizeHandle, RowResizeHandle } from "./TableResizeHandle";

export interface TableViewProps {
  block: BlockNode;
  isFirst: boolean;
}

const DEFAULT_COLUMN_WIDTH = 160;
const DEFAULT_ROW_HEIGHT = 40;

interface TableCellEditableProps {
  blockId: string;
  row: number;
  col: number;
  text: string;
  marks?: MarkRange[];
  canEdit: boolean;
  onChange: (row: number, col: number, text: string) => void;
  onExit: () => void;
}

// Mirrors EditableText's contentEditable pattern (uncontrolled DOM node kept
// in sync via textContent, rather than a controlled React input) so cell
// editing behaves the same way as every other in-place text edit in the
// editor, just scoped to a single cell instead of a whole block.
function TableCellEditable({ blockId, row, col, text, marks, canEdit, onChange, onExit }: TableCellEditableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const marksSignatureRef = useRef<string>("");

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

  return (
    <div
      ref={ref}
      contentEditable={canEdit}
      suppressContentEditableWarning
      className="h-full min-w-[6rem] px-3 py-2 text-sm outline-none focus:bg-accent/40"
      data-table-cell={`${blockId}:${row}:${col}`}
      onInput={(event) => onChange(row, col, event.currentTarget.textContent ?? "")}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.shiftKey) {
          event.preventDefault();
          onExit();
        }
      }}
    />
  );
}

export function TableView({ block }: TableViewProps) {
  const {
    updateTableCell,
    toggleTableCellMark,
    updateTableColumnWidth,
    updateTableRowHeight,
    insertBlockAfterFocused,
    canEdit,
  } = useEditor();
  const rows = block.table?.rows ?? [];
  const cellMarks = block.table?.cellMarks ?? [];
  const columnWidths = block.table?.columnWidths ?? [];
  const rowHeights = block.table?.rowHeights ?? [];

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
                      row={rowIndex}
                      col={colIndex}
                      text={cellText}
                      marks={cellMarks[rowIndex]?.[colIndex]}
                      canEdit={canEdit}
                      onChange={onCellChange}
                      onExit={() => insertBlockAfterFocused(block.id, "paragraph")}
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
