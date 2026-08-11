import type { BlockType, FileData, ImageData } from "../engine/block/block.types";
import type { DocumentModel, FontStyle } from "../engine/document/document.types";
import type { MarkRange } from "../engine/mark/mark.types";

export type DocumentPermission =
  | "OWNER"
  | "FULL_ACCESS"
  | "EDITOR"
  | "COMMENTER"
  | "VIEWER";

export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline"
  | "error";

export interface CreateBlockInput {
  id: string;
  type: BlockType;
  text?: string;
  afterBlockId?: string;
  table?: string[][];
  image?: ImageData;
}

export interface JoinResult {
  success: boolean;
  permission?: DocumentPermission;
  update?: Uint8Array;
}

export interface UpdateAck {
  success: boolean;
}

/**
 * Boundary the rest of the editor talks to. Only YjsCollaborativeDocument
 * (and the small createYDoc-style setup inside it) is allowed to import
 * `yjs` directly — everything else sees this interface.
 */
export interface CollaborativeDocument {
  insertText(blockId: string, offset: number, text: string): void;
  deleteText(blockId: string, offset: number, length: number): void;

  /** Diffs against the current text and applies the minimal insert/delete
   * pair, so a full "new value" from a controlled input still merges at
   * character granularity instead of clobbering concurrent edits. */
  replaceText(blockId: string, text: string): void;

  createBlock(input: CreateBlockInput): void;
  deleteBlock(blockId: string): void;
  moveBlock(blockId: string, targetIndex: number): void;
  setBlockType(blockId: string, type: BlockType): void;

  /** Sets a `codeBlock`'s selected language (e.g. "java", "sql"). */
  setCodeLanguage(blockId: string, language: string): void;

  /** Sets a `todoListItem`'s checked state. */
  setChecked(blockId: string, checked: boolean): void;

  /** Sets a `file` block's attached file (upload result or link). */
  setFileData(blockId: string, file: FileData): void;

  /** Sets an `image` block's attached image (upload result or link). */
  setImageData(blockId: string, image: ImageData): void;

  /** Replaces a block's full set of inline mark ranges (e.g. bold spans). */
  setMarks(blockId: string, marks: MarkRange[]): void;

  /** Sets the document-level full-width layout preference. */
  setFullWidth(fullWidth: boolean): void;

  /** Sets the document-level font style preference. */
  setFontStyle(fontStyle: FontStyle): void;

  /** Sets the document-level small-text preference. */
  setSmallText(smallText: boolean): void;

  /** Replaces a table block's entire grid (used when first turning a block
   * into a table, to seed its default rows). */
  setTableData(blockId: string, rows: string[][]): void;

  /** Updates a single cell's text within a table block's grid. */
  setTableCell(blockId: string, row: number, col: number, text: string): void;

  /** Replaces a single cell's inline mark ranges (e.g. an inline-code span). */
  setTableCellMarks(blockId: string, row: number, col: number, marks: MarkRange[]): void;

  /** Sets one column's pixel width (drag-resize), leaving others untouched. */
  setTableColumnWidth(blockId: string, col: number, width: number): void;

  /** Sets one row's pixel height (drag-resize), leaving others untouched. */
  setTableRowHeight(blockId: string, row: number, height: number): void;

  /** Embeds (or clears, with `null`) a file in a single table cell. */
  setTableCellFile(blockId: string, row: number, col: number, file: FileData | null): void;

  /** Inserts a new empty row at `atIndex`, shifting later rows down. */
  insertTableRow(blockId: string, atIndex: number): void;

  /** Inserts a new empty column at `atIndex`, shifting later columns right. */
  insertTableColumn(blockId: string, atIndex: number): void;

  clearTableColumn(blockId: string, col: number): void;
  duplicateTableColumn(blockId: string, col: number): void;
  deleteTableColumn(blockId: string, col: number): void;
  clearTableRow(blockId: string, row: number): void;
  duplicateTableRow(blockId: string, row: number): void;
  deleteTableRow(blockId: string, row: number): void;

  /** Plain-object snapshot for rendering — the read half of the read path. */
  getSnapshot(): DocumentModel;

  /** Fires after any local or remote change — for UI re-render. */
  subscribe(listener: () => void): () => void;

  /** Fires only for locally-originated changes — for sending over the wire. */
  onLocalUpdate(listener: (update: Uint8Array) => void): () => void;

  encodeState(): Uint8Array;
  applyRemoteUpdate(update: Uint8Array): void;
  destroy(): void;

  /** Reverts the most recent local change (never a remote collaborator's). */
  undo(): void;

  /** Re-applies the most recently undone local change. */
  redo(): void;

  canUndo(): boolean;
  canRedo(): boolean;

  /** Fires whenever canUndo()/canRedo() may have changed — for toolbar UI. */
  subscribeToHistory(listener: () => void): () => void;
}

/**
 * Boundary the collaboration layer talks to for networking. Sees only
 * `Uint8Array`/acks — never knows these bytes are Yjs updates.
 */
export interface CollaborationTransport {
  connect(): Promise<void>;
  joinDocument(documentId: string, knownVersion: number): Promise<JoinResult>;
  sendUpdate(update: Uint8Array): Promise<UpdateAck>;
  onRemoteUpdate(listener: (update: Uint8Array) => void): () => void;

  /** Asks the server to restore the live document to an older version; the
   * resulting diff comes back through the normal `onRemoteUpdate` path. */
  restoreVersion(documentId: string, versionId: string): Promise<UpdateAck>;

  disconnect(): void;
}
