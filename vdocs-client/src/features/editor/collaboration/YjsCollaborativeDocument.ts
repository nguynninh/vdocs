import * as Y from "yjs";
import type { BlockNode, BlockType } from "../engine/block/block.types";
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
  private readonly changeListeners = new Set<() => void>();
  private readonly localUpdateListeners = new Set<(update: Uint8Array) => void>();

  constructor(initialState?: Uint8Array) {
    this.ydoc = new Y.Doc();
    this.blocks = this.ydoc.getArray<Y.Map<unknown>>("blocks");
    this.metadata = this.ydoc.getMap<unknown>("metadata");

    if (initialState?.length) {
      Y.applyUpdate(this.ydoc, initialState, "initial-snapshot");
    }

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

      let marks = block.get("marks") as MarkRange[] | undefined;

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
        if (marks?.length) marks = shiftMarksForDelete(marks, prefixLength, oldEnd - prefixLength);
      }

      if (newEnd > prefixLength) {
        ytext.insert(prefixLength, text.slice(prefixLength, newEnd));
        if (marks?.length) marks = shiftMarksForInsert(marks, prefixLength, newEnd - prefixLength);
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

      next[row][col] = text;
      block.set("table", next);
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
      const columnWidths = block.get("columnWidths") as number[] | undefined;
      const rowHeights = block.get("rowHeights") as number[] | undefined;
      const marks = block.get("marks") as MarkRange[] | undefined;

      blocks.push({
        id: block.get("id") as string,
        type: block.get("type") as BlockType,
        text: (block.get("text") as Y.Text).toString(),
        ...(marks?.length ? { marks } : {}),
        ...(table ? { table: { rows: table, columnWidths, rowHeights } } : {}),
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
    this.ydoc.destroy();
  }
}
