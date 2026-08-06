"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { BlockType } from "../engine/block/block.types";
import { findBlockIndex } from "../engine/document/findBlock";
import type { MarkType } from "../engine/mark/mark.types";
import { toggleMark as toggleMarkRange } from "../engine/mark/toggleMark";
import type { EditorState } from "../engine/state/editorState.types";
import { generateId } from "../engine/utils/id";
import { CollaborationProvider } from "../collaboration/CollaborationProvider";
import type {
  CollaborativeDocument,
  ConnectionState,
  DocumentPermission,
} from "../collaboration/collaboration.types";

function createDefaultTableRows(rowCount = 3, colCount = 3): string[][] {
  return Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => ""));
}

const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

export interface EditorProviderProps {
  documentId: string;
  initialContent?: Uint8Array;
  initialPermission?: DocumentPermission;
  children?: ReactNode;
}

interface EditorContextValue {
  state: EditorState;
  connectionState: ConnectionState;
  permission: DocumentPermission;
  canEdit: boolean;
  wordCount: number;
  fullWidth: boolean;
  setFullWidth: (fullWidth: boolean) => void;
  updateBlockText: (blockId: string, text: string) => void;
  toggleMark: (blockId: string, start: number, end: number, type: MarkType) => void;
  updateTableCell: (blockId: string, row: number, col: number, text: string) => void;
  updateTableColumnWidth: (blockId: string, col: number, width: number) => void;
  updateTableRowHeight: (blockId: string, row: number, height: number) => void;
  insertBlockAfterFocused: (blockId: string, blockType?: BlockType) => void;
  insertTableAfterBlock: (blockId: string, rows: string[][]) => void;
  mergeBlockIntoPrevious: (blockId: string) => void;
  convertBlockType: (blockId: string, blockType: BlockType, text?: string) => void;
  convertBlockTypeForBlocks: (blockIds: string[], blockType: BlockType) => void;
  deleteBlockRange: (startIndex: number, endIndex: number) => void;
  splitPasteIntoBlocks: (blockId: string, before: string, lines: string[], after: string) => void;
  duplicateBlock: (blockId: string) => void;
  duplicateBlocks: (blockIds: string[]) => void;
  removeBlock: (blockId: string) => void;
  removeBlocks: (blockIds: string[]) => void;
  clearFocus: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  documentId,
  initialContent,
  initialPermission,
  children,
}: EditorProviderProps) {
  const [state, setState] = useState<EditorState>({
    document: { blocks: [], fullWidth: false },
    focusBlockId: null,
  });
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [permission, setPermission] = useState<DocumentPermission>(
    initialPermission ?? "VIEWER",
  );
  const documentRef = useRef<CollaborativeDocument | null>(null);

  useLayoutEffect(() => {
    const provider = new CollaborationProvider({
      realtimeUrl: REALTIME_URL,
      documentId,
      initialState: initialContent,
      onConnectionStateChange: setConnectionState,
      onPermission: setPermission,
      onError: (error) => console.error("Collaboration error", error),
    });

    documentRef.current = provider.document;

    const syncState = () => {
      const document = provider.document.getSnapshot();
      setState((current) => ({ document, focusBlockId: current.focusBlockId }));
    };

    syncState();
    const unsubscribe = provider.document.subscribe(syncState);
    let disposed = false;

    // Wait for start() (connect + join) before creating the seed block —
    // onLocalUpdate only starts forwarding to the transport once start()
    // has run, and the transport only has a documentId to send against
    // once join succeeds. Creating it any earlier means this op never
    // leaves the local Y.Doc, so other clients (and Postgres) never see it.
    void provider.start().then(() => {
      if (disposed) return;

      if (provider.document.getSnapshot().blocks.length === 0) {
        const seedBlockId = generateId();
        provider.document.createBlock({
          id: seedBlockId,
          type: "paragraph",
          text: "",
        });
        setState((current) => ({ ...current, focusBlockId: seedBlockId }));
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
      provider.stop();
      documentRef.current = null;
    };
    // documentId identifies which document this provider instance owns for
    // its whole lifetime — a change means a fresh mount, not a re-sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const updateBlockText = useCallback((blockId: string, text: string) => {
    documentRef.current?.replaceText(blockId, text);
  }, []);

  const setFullWidth = useCallback((fullWidth: boolean) => {
    documentRef.current?.setFullWidth(fullWidth);
  }, []);

  const toggleMark = useCallback(
    (blockId: string, start: number, end: number, type: MarkType) => {
      if (start === end) return;
      const block = state.document.blocks.find((candidate) => candidate.id === blockId);
      if (!block) return;

      const nextMarks = toggleMarkRange(block.marks ?? [], type, start, end);
      documentRef.current?.setMarks(blockId, nextMarks);
    },
    [state.document],
  );

  const updateTableCell = useCallback(
    (blockId: string, row: number, col: number, text: string) => {
      documentRef.current?.setTableCell(blockId, row, col, text);
    },
    [],
  );

  const updateTableColumnWidth = useCallback((blockId: string, col: number, width: number) => {
    documentRef.current?.setTableColumnWidth(blockId, col, width);
  }, []);

  const updateTableRowHeight = useCallback((blockId: string, row: number, height: number) => {
    documentRef.current?.setTableRowHeight(blockId, row, height);
  }, []);

  // Used by paste-detection: pasted tabular clipboard text becomes a table
  // block (with the parsed rows already filled in) inserted right after the
  // block the paste happened in, rather than being split into paragraphs.
  const insertTableAfterBlock = useCallback((blockId: string, rows: string[][]) => {
    const newBlockId = generateId();
    documentRef.current?.createBlock({
      id: newBlockId,
      type: "table",
      afterBlockId: blockId,
      table: rows,
    });
    setState((current) => ({ ...current, focusBlockId: newBlockId }));
  }, []);

  const insertBlockAfterFocused = useCallback(
    (blockId: string, blockType?: BlockType) => {
      const newBlockId = generateId();
      documentRef.current?.createBlock({
        id: newBlockId,
        type: blockType ?? "paragraph",
        afterBlockId: blockId,
        table: blockType === "table" ? createDefaultTableRows() : undefined,
      });
      setState((current) => ({ ...current, focusBlockId: newBlockId }));
    },
    [],
  );

  const mergeBlockIntoPrevious = useCallback(
    (blockId: string) => {
      const index = findBlockIndex(state.document, blockId);
      if (index <= 0) return;

      const previous = state.document.blocks[index - 1];
      const current = state.document.blocks[index];

      documentRef.current?.insertText(previous.id, previous.text.length, current.text);
      documentRef.current?.deleteBlock(current.id);

      setState((currentState) => ({ ...currentState, focusBlockId: previous.id }));
    },
    [state.document],
  );

  const convertBlockType = useCallback(
    (blockId: string, blockType: BlockType, text?: string) => {
      documentRef.current?.setBlockType(blockId, blockType);

      if (text !== undefined) {
        documentRef.current?.replaceText(blockId, text);
      }

      if (blockType === "table") {
        const existing = state.document.blocks.find((block) => block.id === blockId);
        if (!existing?.table) {
          documentRef.current?.setTableData(blockId, createDefaultTableRows());
        }
      }

      // Changing a block's type swaps which view renders it, remounting its
      // contentEditable node and dropping DOM focus — refocus so typing can continue.
      setState((current) => ({ ...current, focusBlockId: blockId }));
    },
    [state.document],
  );

  const convertBlockTypeForBlocks = useCallback((blockIds: string[], blockType: BlockType) => {
    blockIds.forEach((id) => documentRef.current?.setBlockType(id, blockType));
    const lastId = blockIds[blockIds.length - 1];
    setState((current) => ({ ...current, focusBlockId: lastId ?? current.focusBlockId }));
  }, []);

  const deleteBlockRange = useCallback(
    (startIndex: number, endIndex: number) => {
      const blocks = state.document.blocks;
      const first = blocks[startIndex];
      if (!first) return;

      // Collapse the whole range into the first block (cleared) instead of
      // deleting it too, so the document always keeps at least one block.
      for (let index = endIndex; index > startIndex; index -= 1) {
        const block = blocks[index];
        if (block) documentRef.current?.deleteBlock(block.id);
      }

      documentRef.current?.replaceText(first.id, "");
      setState((current) => ({ ...current, focusBlockId: first.id }));
    },
    [state.document],
  );

  // Pasting multi-line clipboard content should land as one block per line
  // instead of collapsing into the currently focused block's single text
  // field — `before`/`after` are the text surrounding the caret in that
  // block, so the first and last pasted lines merge with them naturally.
  const splitPasteIntoBlocks = useCallback(
    (blockId: string, before: string, lines: string[], after: string) => {
      documentRef.current?.replaceText(blockId, before + lines[0]);

      let previousId = blockId;
      for (let index = 1; index < lines.length; index += 1) {
        const isLast = index === lines.length - 1;
        const newId = generateId();
        documentRef.current?.createBlock({
          id: newId,
          type: "paragraph",
          text: isLast ? lines[index] + after : lines[index],
          afterBlockId: previousId,
        });
        previousId = newId;
      }

      setState((current) => ({ ...current, focusBlockId: previousId }));
    },
    [],
  );

  const duplicateBlock = useCallback(
    (blockId: string) => {
      const source = state.document.blocks.find((block) => block.id === blockId);
      if (!source) return;

      const newId = generateId();
      documentRef.current?.createBlock({
        id: newId,
        type: source.type,
        text: source.text,
        afterBlockId: blockId,
        table: source.table ? source.table.rows.map((row) => [...row]) : undefined,
      });
      setState((current) => ({ ...current, focusBlockId: newId }));
    },
    [state.document],
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      const blocks = state.document.blocks;
      const index = blocks.findIndex((block) => block.id === blockId);
      if (index === -1) return;

      // Never delete the document's last remaining block — clear it instead
      // so there's always at least one block to focus and type into.
      if (blocks.length === 1) {
        documentRef.current?.replaceText(blockId, "");
        setState((current) => ({ ...current, focusBlockId: blockId }));
        return;
      }

      const nextFocusId = blocks[index - 1]?.id ?? blocks[index + 1]?.id ?? null;
      documentRef.current?.deleteBlock(blockId);
      setState((current) => ({ ...current, focusBlockId: nextFocusId }));
    },
    [state.document],
  );

  // Removes a contiguous multi-block selection (the drag-highlight range) in
  // one go — collapses into the first selected block instead of deleting it
  // too, matching deleteBlockRange's "always keep one block" rule.
  const removeBlocks = useCallback(
    (blockIds: string[]) => {
      if (blockIds.length <= 1) {
        if (blockIds[0]) removeBlock(blockIds[0]);
        return;
      }

      const blocks = state.document.blocks;
      const idSet = new Set(blockIds);
      const indices = blocks
        .map((block, index) => (idSet.has(block.id) ? index : -1))
        .filter((index) => index !== -1);
      if (indices.length === 0) return;

      const startIndex = indices[0];
      const endIndex = indices[indices.length - 1];
      const first = blocks[startIndex];

      for (let index = endIndex; index > startIndex; index -= 1) {
        const block = blocks[index];
        if (block) documentRef.current?.deleteBlock(block.id);
      }

      documentRef.current?.replaceText(first.id, "");
      setState((current) => ({ ...current, focusBlockId: first.id }));
    },
    [state.document, removeBlock],
  );

  // Duplicates a contiguous multi-block selection, preserving order, by
  // chaining each copy after the previous one (starting after the last
  // selected block) rather than after its own source.
  const duplicateBlocks = useCallback(
    (blockIds: string[]) => {
      if (blockIds.length <= 1) {
        if (blockIds[0]) duplicateBlock(blockIds[0]);
        return;
      }

      const blocks = state.document.blocks;
      let insertAfterId = blockIds[blockIds.length - 1];

      blockIds.forEach((id) => {
        const source = blocks.find((block) => block.id === id);
        if (!source) return;

        const newId = generateId();
        documentRef.current?.createBlock({
          id: newId,
          type: source.type,
          text: source.text,
          afterBlockId: insertAfterId,
          table: source.table ? source.table.rows.map((row) => [...row]) : undefined,
        });
        insertAfterId = newId;
      });

      setState((current) => ({ ...current, focusBlockId: insertAfterId }));
    },
    [state.document, duplicateBlock],
  );

  const clearFocus = useCallback(
    () => setState((current) => ({ ...current, focusBlockId: null })),
    [],
  );

  const wordCount = useMemo(
    () =>
      state.document.blocks.reduce(
        (total, block) => total + (block.text.trim().length === 0 ? 0 : block.text.trim().split(/\s+/).length),
        0,
      ),
    [state.document.blocks],
  );

  const canEdit =
    permission === "OWNER" || permission === "FULL_ACCESS" || permission === "EDITOR";

  const value = useMemo<EditorContextValue>(
    () => ({
      state,
      connectionState,
      permission,
      canEdit,
      wordCount,
      fullWidth: state.document.fullWidth,
      setFullWidth,
      updateBlockText,
      toggleMark,
      updateTableCell,
      updateTableColumnWidth,
      updateTableRowHeight,
      insertBlockAfterFocused,
      insertTableAfterBlock,
      mergeBlockIntoPrevious,
      convertBlockType,
      convertBlockTypeForBlocks,
      deleteBlockRange,
      splitPasteIntoBlocks,
      duplicateBlock,
      duplicateBlocks,
      removeBlock,
      removeBlocks,
      clearFocus,
    }),
    [
      state,
      connectionState,
      permission,
      canEdit,
      wordCount,
      setFullWidth,
      updateBlockText,
      toggleMark,
      updateTableCell,
      updateTableColumnWidth,
      updateTableRowHeight,
      insertBlockAfterFocused,
      insertTableAfterBlock,
      mergeBlockIntoPrevious,
      convertBlockType,
      convertBlockTypeForBlocks,
      deleteBlockRange,
      splitPasteIntoBlocks,
      duplicateBlock,
      duplicateBlocks,
      removeBlock,
      removeBlocks,
      clearFocus,
    ],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}
