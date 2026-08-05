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
import type { EditorState } from "../engine/state/editorState.types";
import { generateId } from "../engine/utils/id";
import { CollaborationProvider } from "../collaboration/CollaborationProvider";
import type {
  CollaborativeDocument,
  ConnectionState,
  DocumentPermission,
} from "../collaboration/collaboration.types";

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
  updateBlockText: (blockId: string, text: string) => void;
  insertBlockAfterFocused: (blockId: string, blockType?: BlockType) => void;
  mergeBlockIntoPrevious: (blockId: string) => void;
  convertBlockType: (blockId: string, blockType: BlockType, text?: string) => void;
  deleteBlockRange: (startIndex: number, endIndex: number) => void;
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
    document: { blocks: [] },
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

  const insertBlockAfterFocused = useCallback(
    (blockId: string, blockType?: BlockType) => {
      const newBlockId = generateId();
      documentRef.current?.createBlock({
        id: newBlockId,
        type: blockType ?? "paragraph",
        afterBlockId: blockId,
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

      // Changing a block's type swaps which view renders it, remounting its
      // contentEditable node and dropping DOM focus — refocus so typing can continue.
      setState((current) => ({ ...current, focusBlockId: blockId }));
    },
    [],
  );

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
      updateBlockText,
      insertBlockAfterFocused,
      mergeBlockIntoPrevious,
      convertBlockType,
      deleteBlockRange,
      clearFocus,
    }),
    [
      state,
      connectionState,
      permission,
      canEdit,
      wordCount,
      updateBlockText,
      insertBlockAfterFocused,
      mergeBlockIntoPrevious,
      convertBlockType,
      deleteBlockRange,
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
