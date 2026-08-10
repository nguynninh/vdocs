import * as Y from "yjs";
import type { BlockNode, BlockType, FileData, ImageData } from "../engine/block/block.types";
import type { DocumentModel, FontStyle } from "../engine/document/document.types";
import type { MarkRange } from "../engine/mark/mark.types";
import { shiftMarksForDelete, shiftMarksForInsert } from "../engine/mark/shiftMarks";
import type {
  CollaborativeDocument,
  CreateBlockInput,
} from "./collaboration.types";

/**
 * The only file (besides its own construction of `Y.Doc`) allowed to import
 * `yjs`. Blocks are a `Y.Array<Y.Map>`, each block a `Y.Map` with a
 * `Y.Text` for inline content — CRDT merge happens inside Yjs, everything
 * else (schema, transport, persistence) belongs to this app.
 */
export class YjsCollaborativeDocument implements CollaborativeDocument {
  private readonly ydoc: Y.Doc;
  private readonly blocks: Y.Array<Y.Map<unknown>>;
  private readonly metadata: Y.Map<unknown>;
  private readonly undoManager: Y.UndoManager;
  private readonly changeListeners = new Set<() => void>();
  private readonly localUpdateListeners = new Set<(update: Uint8Array) => void>();

  constructor(initialState?: Uint8Array) {
    this.ydoc = new Y.Doc();
    this.blocks = this.ydoc.getArray<Y.Map<unknown>>("blocks");
    this.metadata = this.ydoc.getMap<unknown>("metadata");

    if (initialState?.length) {
      Y.applyUpdate(this.ydoc, initialState, "initial-snapshot");
    }

    // Tracks only transactions with the default (local) origin — every
    // mutation method below calls `transact()` with no origin, while
    // `applyRemoteUpdate` tags incoming changes "remote" and
    // "initial-snapshot" tags the initial load, so neither pollutes this
    // user's own undo/redo history.
    this.undoManager = new Y.UndoManager([this.blocks, this.metadata], {
      trackedOrigins: new Set([null]),
    });

    this.ydoc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") {
        return;
      }

      this.localUpdateListeners.forEach((listener) => listener(update));
    });

    this.ydoc.on("afterTransaction", () => {
      this.changeListeners.forEach((listener) => listener());
    });
  }

  undo(): void {
    this.undoManager.undo();
  }

  redo(): void {
    this.undoManager.redo();
  }

  canUndo(): boolean {
    return this.undoManager.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.undoManager.redoStack.length > 0;
  }

  subscribeToHistory(listener: () => void): () => void {
    this.undoManager.on("stack-item-added", listener);
    this.undoManager.on("stack-item-popped", listener);
    this.undoManager.on("stack-item-updated", listener);
    return () => {
      this.undoManager.off("stack-item-added", listener);
      this.undoManager.off("stack-item-popped", listener);
      this.undoManager.off("stack-item-updated", listener);
    };
  }

  /** Diffs `oldText`/`newText` down to their minimal changed span and shifts
   * `marks` the same way a delete-then-insert at that span would. Shared by
   * `replaceText` (block text) and `setTableCell` (cell text) so both keep
   * mark offsets correct without duplicating the prefix/suffix scan. */
  private static shiftMarksForReplace(
    oldText: string,
    newText: string,
    marks: MarkRange[] | undefined,
  ): MarkRange[] | undefined {
    if (!marks?.length || oldText === newText) return marks;

    let prefixLength = 0;
    const maxPrefix = Math.min(oldText.length, newText.length);
    while (prefixLength < maxPrefix && oldText[prefixLength] === newText[prefixLength]) {
      prefixLength += 1;
    }

    let oldEnd = oldText.length;
    let newEnd = newText.length;
    while (oldEnd > prefixLength && newEnd > prefixLength && oldText[oldEnd - 1] === newText[newEnd - 1]) {
      oldEnd -= 1;
      newEnd -= 1;
    }

    let next = marks;
    if (oldEnd > prefixLength) next = shiftMarksForDelete(next, prefixLength, oldEnd - prefixLength);
    if (newEnd > prefixLength) next = shiftMarksForInsert(next, prefixLength, newEnd - prefixLength);
    return next;
  }

  private findBlockIndex(blockId: string): number {
    for (let index = 0; index < this.blocks.length; index += 1) {
      if (this.blocks.get(index).get("id") === blockId) {
        return index;
      }
    }

    return -1;
  }

  insertText(blockId: string, offset: number, text: string): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);

      if (index === -1) {
        return;
      }

      const block = this.blocks.get(index);
      const ytext = block.get("text") as Y.Text;
      ytext.insert(offset, text);

      const marks = block.get("marks") as MarkRange[] | undefined;
      if (marks?.length) {
        block.set("marks", shiftMarksForInsert(marks, offset, text.length));
      }
    });
  }

  deleteText(blockId: string, offset: number, length: number): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);

      if (index === -1) {
        return;
      }

      const block = this.blocks.get(index);
      const ytext = block.get("text") as Y.Text;
      ytext.delete(offset, length);

      const marks = block.get("marks") as MarkRange[] | undefined;
      if (marks?.length) {
        block.set("marks", shiftMarksForDelete(marks, offset, length));
      }
    });
  }

  replaceText(blockId: string, text: string): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);

      if (index === -1) {
        return;
      }

      const block = this.blocks.get(index);
      const ytext = block.get("text") as Y.Text;
      const oldText = ytext.toString();

      if (oldText === text) {
        return;
      }

      const marks = YjsCollaborativeDocument.shiftMarksForReplace(
        oldText,
        text,
        block.get("marks") as MarkRange[] | undefined,
      );

      let prefixLength = 0;
      const maxPrefix = Math.min(oldText.length, text.length);

      while (
        prefixLength < maxPrefix &&
        oldText[prefixLength] === text[prefixLength]
      ) {
        prefixLength += 1;
      }

      let oldEnd = oldText.length;
      let newEnd = text.length;

      while (
        oldEnd > prefixLength &&
        newEnd > prefixLength &&
        oldText[oldEnd - 1] === text[newEnd - 1]
      ) {
        oldEnd -= 1;
        newEnd -= 1;
      }

      if (oldEnd > prefixLength) {
        ytext.delete(prefixLength, oldEnd - prefixLength);
      }

      if (newEnd > prefixLength) {
        ytext.insert(prefixLength, text.slice(prefixLength, newEnd));
      }

      if (marks?.length) {
        block.set("marks", marks);
      }
    });
  }

  setMarks(blockId: string, marks: MarkRange[]): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);
      if (index === -1) return;

      this.blocks.get(index).set("marks", marks);
    });
  }

  setBlockType(blockId: string, type: BlockType): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);

      if (index === -1) {
        return;
      }

      this.blocks.get(index).set("type", type);
    });
  }

  setCodeLanguage(blockId: string, language: string): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);

      if (index === -1) {
        return;
      }

      this.blocks.get(index).set("codeLanguage", language);
    });
  }

  setChecked(blockId: string, checked: boolean): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);

      if (index === -1) {
        return;
      }

      this.blocks.get(index).set("checked", checked);
    });
  }

  setFileData(blockId: string, file: FileData): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);

      if (index === -1) {
        return;
      }

      this.blocks.get(index).set("file", file);
    });
  }

  setImageData(blockId: string, image: ImageData): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);

      if (index === -1) {
        return;
      }

      this.blocks.get(index).set("image", image);
    });
  }

  setTableData(blockId: string, rows: string[][]): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);

      if (index === -1) {
        return;
      }

      this.blocks.get(index).set("table", rows.map((row) => [...row]));
    });
  }

  setTableCell(blockId: string, row: number, col: number, text: string): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);

      if (index === -1) {
        return;
      }

      const block = this.blocks.get(index);
      const current = (block.get("table") as string[][] | undefined) ?? [];
      const next = current.map((r) => [...r]);

      while (next.length <= row) {
        next.push([]);
      }
      while (next[row].length <= col) {
        next[row].push("");
      }

      const oldText = next[row][col];
      next[row][col] = text;
      block.set("table", next);

      const tableMarks = (block.get("tableMarks") as MarkRange[][][] | undefined) ?? [];
      const cellMarks = tableMarks[row]?.[col];
      const shifted = YjsCollaborativeDocument.shiftMarksForReplace(oldText, text, cellMarks);
      if (shifted !== cellMarks) {
        this.writeTableCellMarks(block, row, col, shifted ?? []);
      }
    });
  }

  private writeTableCellMarks(block: Y.Map<unknown>, row: number, col: number, marks: MarkRange[]): void {
    const current = (block.get("tableMarks") as MarkRange[][][] | undefined) ?? [];
    const next = current.map((r) => [...r]);

    while (next.length <= row) {
      next.push([]);
    }
    while (next[row].length <= col) {
      next[row].push([]);
    }

    next[row][col] = marks;
    block.set("tableMarks", next);
  }

  setTableCellMarks(blockId: string, row: number, col: number, marks: MarkRange[]): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);
      if (index === -1) return;

      this.writeTableCellMarks(this.blocks.get(index), row, col, marks);
    });
  }

  setTableCellFile(blockId: string, row: number, col: number, file: FileData | null): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);
      if (index === -1) return;

      const block = this.blocks.get(index);
      const current = (block.get("cellFiles") as (FileData | null)[][] | undefined) ?? [];
      const next = current.map((r) => [...r]);

      while (next.length <= row) {
        next.push([]);
      }
      while (next[row].length <= col) {
        next[row].push(null);
      }

      next[row][col] = file;
      block.set("cellFiles", next);

      if (file) {
        // A file occupies the cell in place of text — keep the grid consistent.
        const rows = (block.get("table") as string[][] | undefined) ?? [];
        if (rows[row]?.[col] !== undefined && rows[row][col] !== "") {
          const nextRows = rows.map((r) => [...r]);
          nextRows[row][col] = "";
          block.set("table", nextRows);
        }
      }
    });
  }

  setTableColumnWidth(blockId: string, col: number, width: number): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);
      if (index === -1) return;

      const block = this.blocks.get(index);
      const current = (block.get("columnWidths") as number[] | undefined) ?? [];
      const next = [...current];
      while (next.length <= col) {
        next.push(next.length > 0 ? next[next.length - 1] : 0);
      }
      next[col] = width;
      block.set("columnWidths", next);
    });
  }

  setTableRowHeight(blockId: string, row: number, height: number): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);
      if (index === -1) return;

      const block = this.blocks.get(index);
      const current = (block.get("rowHeights") as number[] | undefined) ?? [];
      const next = [...current];
      while (next.length <= row) {
        next.push(next.length > 0 ? next[next.length - 1] : 0);
      }
      next[row] = height;
      block.set("rowHeights", next);
    });
  }

  insertTableRow(blockId: string, atIndex: number): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);
      if (index === -1) return;

      const block = this.blocks.get(index);
      const table = (block.get("table") as string[][] | undefined) ?? [];
      const columnCount = table[0]?.length ?? 0;
      const nextTable = table.map((r) => [...r]);
      nextTable.splice(atIndex, 0, new Array(columnCount).fill(""));
      block.set("table", nextTable);

      const tableMarks = (block.get("tableMarks") as MarkRange[][][] | undefined) ?? [];
      const nextMarks = tableMarks.map((r) => [...r]);
      nextMarks.splice(atIndex, 0, new Array(columnCount).fill([]));
      block.set("tableMarks", nextMarks);

      const cellFiles = (block.get("cellFiles") as (FileData | null)[][] | undefined) ?? [];
      const nextFiles = cellFiles.map((r) => [...r]);
      nextFiles.splice(atIndex, 0, new Array(columnCount).fill(null));
      block.set("cellFiles", nextFiles);

      const rowHeights = (block.get("rowHeights") as number[] | undefined) ?? [];
      const nextHeights = [...rowHeights];
      nextHeights.splice(atIndex, 0, rowHeights[atIndex] ?? rowHeights[rowHeights.length - 1] ?? 40);
      block.set("rowHeights", nextHeights);
    });
  }

  insertTableColumn(blockId: string, atIndex: number): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);
      if (index === -1) return;

      const block = this.blocks.get(index);
      const table = (block.get("table") as string[][] | undefined) ?? [];
      const nextTable = table.map((r) => {
        const row = [...r];
        row.splice(atIndex, 0, "");
        return row;
      });
      block.set("table", nextTable);

      const tableMarks = (block.get("tableMarks") as MarkRange[][][] | undefined) ?? [];
      const nextMarks = table.map((_, rowIndex) => {
        const row = [...(tableMarks[rowIndex] ?? [])];
        row.splice(atIndex, 0, []);
        return row;
      });
      block.set("tableMarks", nextMarks);

      const cellFiles = (block.get("cellFiles") as (FileData | null)[][] | undefined) ?? [];
      const nextFiles = table.map((_, rowIndex) => {
        const row = [...(cellFiles[rowIndex] ?? [])];
        row.splice(atIndex, 0, null);
        return row;
      });
      block.set("cellFiles", nextFiles);

      const columnWidths = (block.get("columnWidths") as number[] | undefined) ?? [];
      const nextWidths = [...columnWidths];
      nextWidths.splice(atIndex, 0, columnWidths[atIndex] ?? columnWidths[columnWidths.length - 1] ?? 160);
      block.set("columnWidths", nextWidths);
    });
  }

  setFullWidth(fullWidth: boolean): void {
    this.ydoc.transact(() => {
      this.metadata.set("fullWidth", fullWidth);
    });
  }

  setFontStyle(fontStyle: FontStyle): void {
    this.ydoc.transact(() => {
      this.metadata.set("fontStyle", fontStyle);
    });
  }

  setSmallText(smallText: boolean): void {
    this.ydoc.transact(() => {
      this.metadata.set("smallText", smallText);
    });
  }

  getSnapshot(): DocumentModel {
    const blocks: BlockNode[] = [];

    for (let index = 0; index < this.blocks.length; index += 1) {
      const block = this.blocks.get(index);
      const table = block.get("table") as string[][] | undefined;
      const cellMarks = block.get("tableMarks") as MarkRange[][][] | undefined;
      const columnWidths = block.get("columnWidths") as number[] | undefined;
      const rowHeights = block.get("rowHeights") as number[] | undefined;
      const cellFiles = block.get("cellFiles") as (FileData | null)[][] | undefined;
      const marks = block.get("marks") as MarkRange[] | undefined;
      const codeLanguage = block.get("codeLanguage") as string | undefined;
      const checked = block.get("checked") as boolean | undefined;
      const file = block.get("file") as FileData | undefined;
      const image = block.get("image") as ImageData | undefined;

      blocks.push({
        id: block.get("id") as string,
        type: block.get("type") as BlockType,
        text: (block.get("text") as Y.Text | undefined)?.toString() ?? "",
        ...(marks?.length ? { marks } : {}),
        ...(table ? { table: { rows: table, cellMarks, columnWidths, rowHeights, cellFiles } } : {}),
        ...(codeLanguage ? { codeLanguage } : {}),
        ...(checked !== undefined ? { checked } : {}),
        ...(file ? { file } : {}),
        ...(image ? { image } : {}),
      });
    }

    return {
      blocks,
      fullWidth: (this.metadata.get("fullWidth") as boolean | undefined) ?? false,
      fontStyle: (this.metadata.get("fontStyle") as FontStyle | undefined) ?? "default",
      smallText: (this.metadata.get("smallText") as boolean | undefined) ?? false,
    };
  }

  createBlock(input: CreateBlockInput): void {
    this.ydoc.transact(() => {
      const block = new Y.Map<unknown>();
      block.set("id", input.id);
      block.set("type", input.type);

      const ytext = new Y.Text();

      if (input.text) {
        ytext.insert(0, input.text);
      }

      block.set("text", ytext);

      if (input.table) {
        block.set("table", input.table.map((row) => [...row]));
      }

      if (input.image) {
        block.set("image", input.image);
      }

      if (input.type === "todoListItem") {
        block.set("checked", false);
      }

      const afterIndex = input.afterBlockId
        ? this.findBlockIndex(input.afterBlockId)
        : -1;

      const insertAt = afterIndex === -1 ? this.blocks.length : afterIndex + 1;
      this.blocks.insert(insertAt, [block]);
    });
  }

  deleteBlock(blockId: string): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);

      if (index === -1) {
        return;
      }

      this.blocks.delete(index, 1);
    });
  }

  moveBlock(blockId: string, targetIndex: number): void {
    this.ydoc.transact(() => {
      const index = this.findBlockIndex(blockId);

      if (index === -1 || index === targetIndex) {
        return;
      }

      const [block] = this.blocks.slice(index, index + 1);
      this.blocks.delete(index, 1);

      const insertAt = targetIndex > index ? targetIndex - 1 : targetIndex;
      this.blocks.insert(insertAt, [block]);
    });
  }

  subscribe(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  onLocalUpdate(listener: (update: Uint8Array) => void): () => void {
    this.localUpdateListeners.add(listener);
    return () => this.localUpdateListeners.delete(listener);
  }

  encodeState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.ydoc);
  }

  applyRemoteUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.ydoc, update, "remote");
  }

  destroy(): void {
    this.changeListeners.clear();
    this.localUpdateListeners.clear();
    this.undoManager.destroy();
    this.ydoc.destroy();
  }
}
