"use client";

import * as React from "react";
import { GripHorizontal, GripVertical } from "lucide-react";

import AutoGrowTextarea from "@/components/common/AutoGrowTextarea";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { TABLE_HIGHLIGHT_COLORS, type Block } from "./types";

type TableUpdate = Partial<
  Pick<
    Block,
    | "table"
    | "tableHeaderRow"
    | "tableRowColors"
    | "tableColColors"
    | "tableColWidths"
    | "tableRowHeights"
  >
>;

interface TableBlockProps {
  table: string[][];
  headerRow: boolean;
  rowColors?: (string | null)[];
  colColors?: (string | null)[];
  colWidths?: number[];
  rowHeights?: number[];
  onUpdate: (patch: TableUpdate) => void;
}

type Selection = { type: "row" | "col"; index: number } | null;

const DEFAULT_FIRST_COL_WIDTH = 110;
const DEFAULT_COL_WIDTH = 150;
const MIN_COL_WIDTH = 60;
const MIN_ROW_HEIGHT = 32;
const GUTTER = 18;

function colorClass(colorId: string | null | undefined) {
  return TABLE_HIGHLIGHT_COLORS.find((color) => color.id === colorId)?.cellClass;
}

function withoutIndex<T>(list: T[], index: number): T[] {
  const next = [...list];
  next.splice(index, 1);
  return next;
}

function insertAt<T>(list: T[], index: number, value: T): T[] {
  const next = [...list];
  next.splice(index, 0, value);
  return next;
}

function prefixSums(sizes: number[]): number[] {
  const result: number[] = [0];
  for (const size of sizes) result.push(result[result.length - 1] + size);
  return result;
}

function buildColWidths(colCount: number, stored?: number[]) {
  return Array.from(
    { length: colCount },
    (_, i) => stored?.[i] ?? (i === 0 ? DEFAULT_FIRST_COL_WIDTH : DEFAULT_COL_WIDTH)
  );
}

function buildRowHeights(rowCount: number, stored?: number[]) {
  return Array.from({ length: rowCount }, (_, i) => stored?.[i] ?? MIN_ROW_HEIGHT);
}

export default function TableBlock({
  table,
  headerRow,
  rowColors = [],
  colColors = [],
  colWidths: storedColWidths,
  rowHeights: storedRowHeights,
  onUpdate,
}: TableBlockProps) {
  const colCount = table[0]?.length ?? 0;
  const rowCount = table.length;

  const [colWidths, setColWidths] = React.useState(() => buildColWidths(colCount, storedColWidths));
  const colWidthsRef = React.useRef(colWidths);
  colWidthsRef.current = colWidths;
  React.useEffect(() => {
    setColWidths(buildColWidths(colCount, storedColWidths));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colCount, storedColWidths]);

  const [rowMinHeights, setRowMinHeights] = React.useState(() => buildRowHeights(rowCount, storedRowHeights));
  const rowMinHeightsRef = React.useRef(rowMinHeights);
  rowMinHeightsRef.current = rowMinHeights;
  React.useEffect(() => {
    setRowMinHeights(buildRowHeights(rowCount, storedRowHeights));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowCount, storedRowHeights]);

  const [measuredRowHeights, setMeasuredRowHeights] = React.useState<number[]>([]);
  const rowRefs = React.useRef<(HTMLTableRowElement | null)[]>([]);

  React.useLayoutEffect(() => {
    function measure() {
      setMeasuredRowHeights(rowRefs.current.map((el) => el?.getBoundingClientRect().height ?? MIN_ROW_HEIGHT));
    }
    measure();
    const observer = new ResizeObserver(measure);
    rowRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [table, colWidths, rowMinHeights, headerRow]);

  const [hoverRow, setHoverRow] = React.useState<number | null>(null);
  const [hoverCol, setHoverCol] = React.useState<number | null>(null);
  const [selection, setSelection] = React.useState<Selection>(null);
  const [scrollLeft, setScrollLeft] = React.useState(0);

  const rowHeightsForLayout = measuredRowHeights.length === rowCount ? measuredRowHeights : rowMinHeights;
  const colOffsets = prefixSums(colWidths);
  const rowOffsets = prefixSums(rowHeightsForLayout);
  const totalColWidth = colOffsets[colOffsets.length - 1];
  const totalRowHeight = rowOffsets[rowOffsets.length - 1];

  function handleMenuOpenChange(target: NonNullable<Selection>, open: boolean) {
    setSelection((current) => {
      if (open) return target;
      if (current && current.type === target.type && current.index === target.index) return null;
      return current;
    });
  }

  function insertRow(index: number, position: "above" | "below") {
    const at = position === "above" ? index : index + 1;
    const blank = Array.from({ length: colCount }, () => "");
    onUpdate({
      table: insertAt(table, at, blank),
      tableRowColors: insertAt(rowColors, at, null),
      tableRowHeights: insertAt(rowMinHeights, at, MIN_ROW_HEIGHT),
    });
  }

  function insertCol(index: number, position: "left" | "right") {
    const at = position === "left" ? index : index + 1;
    onUpdate({
      table: table.map((row) => insertAt(row, at, "")),
      tableColColors: insertAt(colColors, at, null),
      tableColWidths: insertAt(colWidths, at, colWidths[index] ?? DEFAULT_COL_WIDTH),
    });
  }

  function duplicateRow(index: number) {
    onUpdate({
      table: insertAt(table, index + 1, [...table[index]]),
      tableRowColors: insertAt(rowColors, index + 1, rowColors[index] ?? null),
      tableRowHeights: insertAt(rowMinHeights, index + 1, rowMinHeights[index]),
    });
  }

  function duplicateCol(index: number) {
    onUpdate({
      table: table.map((row) => insertAt(row, index + 1, row[index] ?? "")),
      tableColColors: insertAt(colColors, index + 1, colColors[index] ?? null),
      tableColWidths: insertAt(colWidths, index + 1, colWidths[index]),
    });
  }

  function clearRow(index: number) {
    onUpdate({ table: table.map((row, rowIndex) => (rowIndex === index ? row.map(() => "") : row)) });
  }

  function clearCol(index: number) {
    onUpdate({
      table: table.map((row) => row.map((cell, cellIndex) => (cellIndex === index ? "" : cell))),
    });
  }

  function deleteRow(index: number) {
    if (table.length <= 1) return;
    onUpdate({
      table: withoutIndex(table, index),
      tableRowColors: withoutIndex(rowColors, index),
      tableRowHeights: withoutIndex(rowMinHeights, index),
    });
    setSelection(null);
  }

  function deleteCol(index: number) {
    if (colCount <= 1) return;
    onUpdate({
      table: table.map((row) => withoutIndex(row, index)),
      tableColColors: withoutIndex(colColors, index),
      tableColWidths: withoutIndex(colWidths, index),
    });
    setSelection(null);
  }

  function setRowColor(index: number, colorId: string | null) {
    const next = [...rowColors];
    next[index] = colorId;
    onUpdate({ tableRowColors: next });
  }

  function setColColor(index: number, colorId: string | null) {
    const next = [...colColors];
    next[index] = colorId;
    onUpdate({ tableColColors: next });
  }

  function handleCellChange(rowIndex: number, cellIndex: number, value: string) {
    onUpdate({
      table: table.map((row, r) => (r === rowIndex ? row.map((c, ci) => (ci === cellIndex ? value : c)) : row)),
    });
  }

  function startColResize(index: number, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = colWidths[index];
    function onMove(e: MouseEvent) {
      const next = Math.max(MIN_COL_WIDTH, startWidth + (e.clientX - startX));
      const updated = colWidthsRef.current.map((w, i) => (i === index ? next : w));
      colWidthsRef.current = updated;
      setColWidths(updated);
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      onUpdate({ tableColWidths: colWidthsRef.current });
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function startRowResize(index: number, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    const startHeight = rowMinHeights[index];
    function onMove(e: MouseEvent) {
      const next = Math.max(MIN_ROW_HEIGHT, startHeight + (e.clientY - startY));
      const updated = rowMinHeightsRef.current.map((h, i) => (i === index ? next : h));
      rowMinHeightsRef.current = updated;
      setRowMinHeights(updated);
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      onUpdate({ tableRowHeights: rowMinHeightsRef.current });
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function renderMenu(target: { type: "row" | "col"; index: number }) {
    const isRow = target.type === "row";
    return (
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuCheckboxItem
          checked={headerRow}
          onCheckedChange={(checked) => onUpdate({ tableHeaderRow: checked === true })}
        >
          Header row
        </DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Color</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => (isRow ? setRowColor(target.index, null) : setColColor(target.index, null))}
            >
              <span className="size-3 rounded-full border border-border" />
              Default
            </DropdownMenuItem>
            {TABLE_HIGHLIGHT_COLORS.map((color) => (
              <DropdownMenuItem
                key={color.id}
                onClick={() =>
                  isRow ? setRowColor(target.index, color.id) : setColColor(target.index, color.id)
                }
              >
                <span className={cn("size-3 rounded-full", color.swatch)} />
                {color.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => (isRow ? insertRow(target.index, "above") : insertCol(target.index, "left"))}
        >
          {isRow ? "Insert above" : "Insert left"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => (isRow ? insertRow(target.index, "below") : insertCol(target.index, "right"))}
        >
          {isRow ? "Insert below" : "Insert right"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => (isRow ? duplicateRow(target.index) : duplicateCol(target.index))}>
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => (isRow ? clearRow(target.index) : clearCol(target.index))}>
          Clear contents
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => (isRow ? deleteRow(target.index) : deleteCol(target.index))}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    );
  }

  return (
    <div
      className="relative"
      style={{ paddingTop: GUTTER, paddingLeft: GUTTER, width: totalColWidth + GUTTER + 2 }}
    >
      <div
        className="pointer-events-none absolute top-0 overflow-hidden"
        style={{ left: GUTTER, height: GUTTER, width: `calc(100% - ${GUTTER}px)` }}
      >
        <div
          className="relative"
          style={{ width: totalColWidth, height: GUTTER, transform: `translateX(-${scrollLeft}px)` }}
        >
          {colWidths.map((width, colIndex) => {
            const active =
              hoverCol === colIndex || (selection?.type === "col" && selection.index === colIndex);
            return (
              <div
                key={colIndex}
                className="pointer-events-auto absolute top-0 flex items-center justify-center"
                style={{ left: colOffsets[colIndex], width, height: GUTTER }}
                onMouseEnter={() => setHoverCol(colIndex)}
                onMouseLeave={() => setHoverCol((current) => (current === colIndex ? null : current))}
              >
                <DropdownMenu
                  onOpenChange={(open) => handleMenuOpenChange({ type: "col", index: colIndex }, open)}
                >
                  <DropdownMenuTrigger
                    className={cn(
                      "flex h-3.5 w-7 items-center justify-center rounded-sm bg-muted-foreground/20 text-muted-foreground opacity-0 outline-none hover:bg-muted-foreground/40",
                      active && "opacity-100"
                    )}
                  >
                    <GripHorizontal className="size-3" />
                  </DropdownMenuTrigger>
                  {renderMenu({ type: "col", index: colIndex })}
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="pointer-events-none absolute left-0 overflow-hidden"
        style={{ top: GUTTER, width: GUTTER, height: totalRowHeight }}
      >
        {rowHeightsForLayout.map((height, rowIndex) => {
          const active = hoverRow === rowIndex || (selection?.type === "row" && selection.index === rowIndex);
          return (
            <div
              key={rowIndex}
              className="pointer-events-auto absolute left-0 flex items-center justify-center"
              style={{ top: rowOffsets[rowIndex], height, width: GUTTER }}
              onMouseEnter={() => setHoverRow(rowIndex)}
              onMouseLeave={() => setHoverRow((current) => (current === rowIndex ? null : current))}
            >
              <DropdownMenu onOpenChange={(open) => handleMenuOpenChange({ type: "row", index: rowIndex }, open)}>
                <DropdownMenuTrigger
                  className={cn(
                    "flex h-7 w-3.5 items-center justify-center rounded-sm bg-muted-foreground/20 text-muted-foreground opacity-0 outline-none hover:bg-muted-foreground/40",
                    active && "opacity-100"
                  )}
                >
                  <GripVertical className="size-3" />
                </DropdownMenuTrigger>
                {renderMenu({ type: "row", index: rowIndex })}
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto" onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}>
        <div className="relative" style={{ width: totalColWidth }}>
          {colOffsets.slice(1, -1).map((left, i) => (
            <div
              key={i}
              className="group/colresize absolute top-0 z-20 flex w-4 cursor-col-resize justify-center"
              style={{ left: left - 8, height: totalRowHeight }}
              onMouseDown={(event) => startColResize(i, event)}
            >
              <div className="h-full w-0.5 bg-transparent group-hover/colresize:bg-blue-500" />
            </div>
          ))}
          {rowOffsets.slice(1, -1).map((top, i) => (
            <div
              key={i}
              className="group/rowresize absolute left-0 z-20 flex h-4 cursor-row-resize items-center"
              style={{ top: top - 8, width: totalColWidth }}
              onMouseDown={(event) => startRowResize(i, event)}
            >
              <div className="h-0.5 w-full bg-transparent group-hover/rowresize:bg-blue-500" />
            </div>
          ))}
        <table
          className="border-collapse text-left text-sm text-foreground"
          style={{ width: totalColWidth, tableLayout: "fixed", boxSizing: "border-box" }}
        >
          <colgroup>
            {colWidths.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
          <tbody>
            {table.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                ref={(el) => {
                  rowRefs.current[rowIndex] = el;
                }}
                className={cn(rowIndex === 0 && headerRow && "bg-muted/40 font-semibold")}
              >
                {row.map((cell, cellIndex) => {
                  const Cell = rowIndex === 0 && headerRow ? "th" : "td";
                  const isSelected =
                    (selection?.type === "row" && selection.index === rowIndex) ||
                    (selection?.type === "col" && selection.index === cellIndex);
                  return (
                    <Cell
                      key={cellIndex}
                      style={{ minHeight: rowMinHeights[rowIndex] }}
                      className={cn(
                        "relative border border-border p-0 align-top leading-5",
                        cellIndex === 0 && "font-semibold italic",
                        rowIndex === 1 && cellIndex > 0 && "font-semibold text-blue-600",
                        colorClass(rowColors[rowIndex]) ?? colorClass(colColors[cellIndex]),
                        isSelected && "ring-2 ring-inset ring-blue-500"
                      )}
                    >
                      <div className="pointer-events-none absolute inset-0 whitespace-pre-wrap break-words px-1.5 py-1">
                        {cell.split("\n").map((line, lineIndex) => (
                          <React.Fragment key={lineIndex}>
                            {lineIndex > 0 && <br />}
                            <span className={line.trim().startsWith("force update =") ? "text-red-500" : undefined}>
                              {line}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                      <AutoGrowTextarea
                        value={cell}
                        onValueChange={(value) => handleCellChange(rowIndex, cellIndex, value)}
                        className="relative z-10 whitespace-pre-wrap break-words px-1.5 py-1 leading-5 text-transparent caret-foreground"
                      />
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
