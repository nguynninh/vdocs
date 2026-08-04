"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/apis/axiosClient";
import {
  createDocument,
  getDocument,
  renameDocument,
  saveDocumentContent,
  setDocumentLocked,
  trashDocument,
} from "@/apis/documents";
import { useLocale } from "@/components/layout/locale-provider";
import Sidebar from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

import DocumentBlockEditor, { createBlock } from "./DocumentBlockEditor";
import type { Block } from "./blocks/types";
import DocumentHeader, { type DocumentHeaderMeta } from "./DocumentHeader";
import DocumentTitleInput from "./DocumentTitleInput";
import DocumentToolbar from "./DocumentToolbar";

interface DocumentEditorProps {
  documentId: string;
}

type SaveStatus = "idle" | "editing" | "saving" | "saved" | "conflict" | "error";

const SAVE_DEBOUNCE_MS = 1500;
const HISTORY_DEBOUNCE_MS = 500;
const MAX_HISTORY_ENTRIES = 100;
const SMALL_TEXT_STORAGE_KEY = "document.smallText";
const SUBLIST_HINT_STORAGE_KEY = "document.sublistHintUsed";

function fullWidthStorageKey(documentId: string) {
  return `document.${documentId}.fullWidth`;
}

interface BlockHistory {
  stack: Block[][];
  index: number;
}

const HEADING_TYPES = ["heading1", "heading2", "heading3"] as const;

function serializeBlocks(blocks: Block[]): string {
  return JSON.stringify(blocks);
}

function parseBlocks(content: string | null): Block[] {
  if (!content) return [createBlock()];
  try {
    const parsed = JSON.parse(content) as Block[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [createBlock()];
  } catch {
    return [createBlock()];
  }
}

function DocumentHeaderNavigator({ blocks }: { blocks: Block[] }) {
  const headings = blocks.filter(
    (block) => HEADING_TYPES.includes(block.type as (typeof HEADING_TYPES)[number]) && block.text.trim()
  );

  if (headings.length === 0) return null;

  function scrollToBlock(blockId: string) {
    const block = document.getElementById(`document-block-${blockId}`);
    if (!block) return;
    window.scrollTo({
      top: block.getBoundingClientRect().top + window.scrollY - 72,
      behavior: "smooth",
    });
  }

  return (
    <nav
      aria-label="Document headers"
      className="group fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 md:block"
    >
      <div className="flex h-16 w-5 items-center justify-center">
        <div className="flex flex-col gap-2">
          <span className="h-px w-3 bg-foreground/70" />
          <span className="h-px w-3 bg-foreground/25" />
        </div>
      </div>
      <div className="pointer-events-none absolute right-6 top-1/2 max-h-[60vh] w-56 -translate-y-1/2 overflow-y-auto border border-border bg-background py-1 opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        {headings.map((heading) => (
          <button
            key={heading.id}
            type="button"
            onClick={() => scrollToBlock(heading.id)}
            className={cn(
              "block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-muted",
              heading.type === "heading2" && "pl-5 text-xs",
              heading.type === "heading3" && "pl-7 text-xs text-muted-foreground"
            )}
            title={heading.text}
          >
            {heading.text}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function DocumentEditor({ documentId }: DocumentEditorProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [blocks, setBlocks] = React.useState<Block[]>(() => [
    { id: "pending-block", type: "paragraph", text: "" },
  ]);
  const [meta, setMeta] = React.useState<DocumentHeaderMeta | null>(null);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const [locked, setLocked] = React.useState(false);
  const [smallText, setSmallText] = React.useState(false);
  const [fullWidth, setFullWidth] = React.useState(false);
  const [sublistHintUsed, setSublistHintUsed] = React.useState(false);
  const [duplicating, setDuplicating] = React.useState(false);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  const loadedRef = React.useRef(false);
  const lastSavedTitleRef = React.useRef("");
  const lastSavedContentRef = React.useRef("");
  const contentRevisionRef = React.useRef(0);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = React.useRef(false);
  const titleRef = React.useRef(title);
  const blocksRef = React.useRef(blocks);
  titleRef.current = title;
  blocksRef.current = blocks;

  const historyRef = React.useRef<BlockHistory>({ stack: [], index: -1 });
  const historyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipHistoryPushRef = React.useRef(false);

  // Read view preferences after mount only, so the SSR-ed markup always matches
  // the client's first paint; localStorage isn't available on the server.
  React.useEffect(() => {
    setSmallText(window.localStorage.getItem(SMALL_TEXT_STORAGE_KEY) === "1");
    setFullWidth(window.localStorage.getItem(fullWidthStorageKey(documentId)) === "1");
    setSublistHintUsed(window.localStorage.getItem(SUBLIST_HINT_STORAGE_KEY) === "1");
  }, [documentId]);

  function handleSublistUsed() {
    setSublistHintUsed(true);
    window.localStorage.setItem(SUBLIST_HINT_STORAGE_KEY, "1");
  }

  function handleToggleFavorite() {
    // TODO: call the favorite-toggle API once the backend exposes one.
    setIsFavorite((current) => !current);
  }

  function handleToggleSmallText() {
    setSmallText((current) => {
      const next = !current;
      window.localStorage.setItem(SMALL_TEXT_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  function handleToggleFullWidth() {
    setFullWidth((current) => {
      const next = !current;
      window.localStorage.setItem(fullWidthStorageKey(documentId), next ? "1" : "0");
      return next;
    });
  }

  async function handleToggleLock() {
    const next = !locked;
    setLocked(next);
    try {
      const response = await setDocumentLocked(documentId, next);
      setLocked(response.locked);
    } catch {
      setLocked(!next);
    }
  }

  async function handleDuplicate() {
    if (duplicating) return;
    setDuplicating(true);
    try {
      const currentTitle = titleRef.current;
      const currentContent = serializeBlocks(blocksRef.current);
      const duplicate = await createDocument();
      if (currentTitle) {
        await renameDocument(duplicate.id, currentTitle);
      }
      if (currentContent) {
        await saveDocumentContent(duplicate.id, currentContent, duplicate.contentRevision);
      }
      router.push(`/document/${duplicate.id}`);
    } finally {
      setDuplicating(false);
    }
  }

  async function handleTrash() {
    await trashDocument(documentId);
    router.push("/");
  }

  const flushSave = React.useCallback(async () => {
    if (isSavingRef.current) return;

    const currentTitle = titleRef.current;
    const currentContent = serializeBlocks(blocksRef.current);
    const titleChanged = currentTitle !== lastSavedTitleRef.current;
    const contentChanged = currentContent !== lastSavedContentRef.current;

    if (!titleChanged && !contentChanged) {
      setSaveStatus("saved");
      return;
    }

    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      if (titleChanged) {
        await renameDocument(documentId, currentTitle);
        lastSavedTitleRef.current = currentTitle;
      }

      if (contentChanged) {
        const response = await saveDocumentContent(documentId, currentContent, contentRevisionRef.current);
        contentRevisionRef.current = response.contentRevision;
        lastSavedContentRef.current = currentContent;
      }

      setSaveStatus("saved");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Someone else changed the document; reload the authoritative copy and drop local edits.
        try {
          const latest = await getDocument(documentId);
          setTitle(latest.title ?? "");
          setBlocks(parseBlocks(latest.content));
          lastSavedTitleRef.current = latest.title ?? "";
          lastSavedContentRef.current = serializeBlocks(parseBlocks(latest.content));
          contentRevisionRef.current = latest.contentRevision;
        } catch {
          // ignore; user can retry by editing again
        }
        setSaveStatus("conflict");
      } else {
        setSaveStatus("error");
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [documentId]);

  React.useEffect(() => {
    let ignore = false;

    getDocument(documentId)
      .then((document) => {
        if (ignore) return;
        const loadedTitle = document.title ?? "";
        const loadedBlocks = parseBlocks(document.content);

        setTitle(loadedTitle);
        setBlocks(loadedBlocks);
        setLocked(document.locked);
        setMeta({
          createdAt: document.createdAt,
          createdBy: document.createdBy,
          updatedAt: document.updatedAt,
          updatedBy: document.updatedBy,
        });

        lastSavedTitleRef.current = loadedTitle;
        lastSavedContentRef.current = serializeBlocks(loadedBlocks);
        contentRevisionRef.current = document.contentRevision;
        historyRef.current = { stack: [loadedBlocks], index: 0 };
        loadedRef.current = true;
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
      loadedRef.current = false;
    };
  }, [documentId]);

  React.useEffect(() => {
    if (!loadedRef.current) return;

    const dirty =
      title !== lastSavedTitleRef.current || serializeBlocks(blocks) !== lastSavedContentRef.current;

    if (!dirty) return;

    setSaveStatus("editing");

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      flushSave();
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, blocks, flushSave]);

  React.useEffect(() => {
    if (!loadedRef.current) return;

    if (skipHistoryPushRef.current) {
      skipHistoryPushRef.current = false;
      return;
    }

    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      pushHistoryEntry(blocks);
    }, HISTORY_DEBOUNCE_MS);

    return () => {
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    };
  }, [blocks]);

  function pushHistoryEntry(entry: Block[]) {
    const history = historyRef.current;
    if (history.stack[history.index] === entry) return;
    const truncated = history.stack.slice(0, history.index + 1);
    truncated.push(entry);
    if (truncated.length > MAX_HISTORY_ENTRIES) truncated.shift();
    historyRef.current = { stack: truncated, index: truncated.length - 1 };
  }

  function handleUndo() {
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
      pushHistoryEntry(blocksRef.current);
    }

    const history = historyRef.current;
    if (history.index <= 0) return;
    const nextIndex = history.index - 1;
    historyRef.current = { ...history, index: nextIndex };
    skipHistoryPushRef.current = true;
    setBlocks(history.stack[nextIndex]);
  }

  function handleRedo() {
    const history = historyRef.current;
    if (history.index >= history.stack.length - 1) return;
    const nextIndex = history.index + 1;
    historyRef.current = { ...history, index: nextIndex };
    skipHistoryPushRef.current = true;
    setBlocks(history.stack[nextIndex]);
  }

  function handleBodyKeyDownCapture(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
    event.preventDefault();
    if (event.shiftKey) {
      handleRedo();
    } else {
      handleUndo();
    }
  }

  React.useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      const dirty =
        titleRef.current !== lastSavedTitleRef.current ||
        serializeBlocks(blocksRef.current) !== lastSavedContentRef.current;

      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const saveStatusLabel =
    saveStatus === "editing"
      ? t("document.saveStatus.editing")
      : saveStatus === "saving"
        ? t("document.saveStatus.saving")
        : saveStatus === "saved"
          ? t("document.saveStatus.saved")
          : saveStatus === "conflict"
            ? t("document.saveStatus.conflict")
            : saveStatus === "error"
              ? t("document.saveStatus.error")
              : undefined;

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <DocumentHeader
          title={title}
          meta={meta}
          isFavorite={isFavorite}
          onToggleFavorite={handleToggleFavorite}
          saveStatusLabel={saveStatusLabel}
          locked={locked}
          onToggleLock={handleToggleLock}
          smallText={smallText}
          onToggleSmallText={handleToggleSmallText}
          fullWidth={fullWidth}
          onToggleFullWidth={handleToggleFullWidth}
          onDuplicate={handleDuplicate}
          onTrash={handleTrash}
        />
        <DocumentHeaderNavigator blocks={blocks} />

        <div
          className={cn(
            "mx-auto flex w-full flex-col gap-3 px-6 py-10 md:px-16",
            fullWidth ? "max-w-none" : "max-w-3xl",
            smallText && "text-sm"
          )}
        >
          {locked && (
            <p className="-mb-1 text-xs text-muted-foreground">{t("document.actions.locked")}</p>
          )}

          <div
            aria-disabled={locked}
            className={cn("flex flex-col gap-3", locked && "pointer-events-none select-none opacity-60")}
          >
            <DocumentToolbar className="-ml-2" documentId={documentId} />

            <DocumentTitleInput
              value={title}
              onChange={setTitle}
              onSubmit={() => bodyRef.current?.focus()}
              placeholder={t("document.untitled")}
              className={cn(smallText && "text-2xl")}
            />

            <div onKeyDownCapture={handleBodyKeyDownCapture}>
              <DocumentBlockEditor
                ref={bodyRef}
                documentId={documentId}
                blocks={blocks}
                onChange={setBlocks}
                placeholder={t("document.body.placeholder")}
                sublistHintEnabled={!sublistHintUsed}
                onSublistUsed={handleSublistUsed}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
