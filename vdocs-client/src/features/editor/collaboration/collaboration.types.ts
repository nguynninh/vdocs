import type { BlockType } from "../engine/block/block.types";
import type { DocumentModel } from "../engine/document/document.types";

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

  /** Plain-object snapshot for rendering — the read half of the read path. */
  getSnapshot(): DocumentModel;

  /** Fires after any local or remote change — for UI re-render. */
  subscribe(listener: () => void): () => void;

  /** Fires only for locally-originated changes — for sending over the wire. */
  onLocalUpdate(listener: (update: Uint8Array) => void): () => void;

  encodeState(): Uint8Array;
  applyRemoteUpdate(update: Uint8Array): void;
  destroy(): void;
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
  disconnect(): void;
}
