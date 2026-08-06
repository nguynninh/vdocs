import * as Y from "yjs";
import { prisma } from "../configuration/prisma.ts";
import { versionRepository } from "../repositories/version.repository.ts";

interface RoomState {
  ydoc: Y.Doc;
  dirty: boolean;
  saveTimer: NodeJS.Timeout | null;
  refCount: number;
  lastSnapshotAt: number;
}

// Single-node Phase 1: hold one Y.Doc per open document in memory, debounce
// writes to Postgres.
const SAVE_DEBOUNCE_MS = 2_500;
const EVICT_GRACE_MS = 5_000;
// Auto-snapshots are throttled to this interval so a burst of edits within
// the same window collapses into a single checkpoint rather than one row
// per debounced save. A checkpoint is only ever attempted on the trailing
// edge of the save debounce (i.e. once you stop typing) — this just caps
// how often that can produce a new row.
const AUTO_SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;

const rooms = new Map<string, RoomState>();

async function maybeSnapshot(
  documentId: string,
  room: RoomState,
  state: Buffer,
  contentVersion: number,
  force: boolean
): Promise<void> {
  const now = Date.now();

  if (!force && now - room.lastSnapshotAt < AUTO_SNAPSHOT_INTERVAL_MS) {
    return;
  }

  room.lastSnapshotAt = now;

  await versionRepository.create({
    documentId,
    ydocState: state,
    contentVersion,
    trigger: "auto",
  });
}

async function loadYDocFromDb(documentId: string): Promise<Y.Doc> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { ydocState: true },
  });

  const ydoc = new Y.Doc();

  if (document?.ydocState) {
    Y.applyUpdate(ydoc, new Uint8Array(document.ydocState), "persistence-load");
  }

  return ydoc;
}

async function persist(
  documentId: string,
  room: RoomState,
  snapshot: "auto" | "force" | "skip" = "auto"
): Promise<void> {
  room.dirty = false;

  const state = Buffer.from(Y.encodeStateAsUpdate(room.ydoc));

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      ydocState: state,
      contentVersion: { increment: 1 },
    },
  });

  if (snapshot !== "skip") {
    await maybeSnapshot(
      documentId,
      room,
      state,
      updated.contentVersion,
      snapshot === "force"
    );
  }
}

function scheduleSave(documentId: string, room: RoomState): void {
  room.dirty = true;

  if (room.saveTimer) {
    return;
  }

  room.saveTimer = setTimeout(() => {
    room.saveTimer = null;
    persist(documentId, room).catch((error) => {
      console.error(`Failed to persist document ${documentId}`, error);
    });
  }, SAVE_DEBOUNCE_MS);
}

export async function acquireRoom(documentId: string): Promise<RoomState> {
  let room = rooms.get(documentId);

  if (!room) {
    const ydoc = await loadYDocFromDb(documentId);
    room = { ydoc, dirty: false, saveTimer: null, refCount: 0, lastSnapshotAt: Date.now() };
    rooms.set(documentId, room);
  }

  room.refCount += 1;

  return room;
}

export function applyRemoteUpdate(documentId: string, update: Uint8Array): void {
  const room = rooms.get(documentId);

  if (!room) {
    return;
  }

  Y.applyUpdate(room.ydoc, update, "remote-client");
  scheduleSave(documentId, room);
}

export function encodeState(documentId: string): Uint8Array {
  const room = rooms.get(documentId);

  if (!room) {
    return new Uint8Array();
  }

  return Y.encodeStateAsUpdate(room.ydoc);
}

/**
 * Restores the live in-memory doc to look like an older snapshot. Yjs is a
 * CRDT — applying the snapshot's update alone would only *merge* it in, not
 * remove content added since. Instead this clears the live `blocks`/`metadata`
 * shared types and re-populates them from a temp doc loaded from the
 * snapshot, mirroring the shared-type layout defined by the client's
 * YjsCollaborativeDocument. The result is a normal set of CRDT ops that
 * merges safely and can be broadcast like any other update.
 */
export function restoreVersion(documentId: string, snapshotState: Uint8Array): Uint8Array | null {
  const room = rooms.get(documentId);

  if (!room) {
    return null;
  }

  const snapshotDoc = new Y.Doc();

  if (snapshotState.length > 0) {
    Y.applyUpdate(snapshotDoc, snapshotState, "version-restore-source");
  }

  const snapshotBlocks = snapshotDoc.getArray<Y.Map<unknown>>("blocks");
  const snapshotMetadata = snapshotDoc.getMap<unknown>("metadata");

  const beforeVector = Y.encodeStateVector(room.ydoc);

  room.ydoc.transact(() => {
    const blocks = room.ydoc.getArray<Y.Map<unknown>>("blocks");
    const metadata = room.ydoc.getMap<unknown>("metadata");

    blocks.delete(0, blocks.length);

    const clonedBlocks = [];
    for (let index = 0; index < snapshotBlocks.length; index += 1) {
      const source = snapshotBlocks.get(index);
      const clone = new Y.Map<unknown>();

      for (const key of ["id", "type", "table", "columnWidths", "rowHeights", "marks"]) {
        if (source.has(key)) {
          clone.set(key, source.get(key));
        }
      }

      const text = new Y.Text();
      text.insert(0, (source.get("text") as Y.Text).toString());
      clone.set("text", text);

      clonedBlocks.push(clone);
    }
    blocks.insert(0, clonedBlocks);

    for (const key of ["fullWidth", "fontStyle", "smallText"]) {
      if (snapshotMetadata.has(key)) {
        metadata.set(key, snapshotMetadata.get(key));
      }
    }
  }, "version-restore");

  snapshotDoc.destroy();
  scheduleSave(documentId, room);

  return Y.encodeStateAsUpdate(room.ydoc, beforeVector);
}

export function releaseRoom(documentId: string): void {
  const room = rooms.get(documentId);

  if (!room) {
    return;
  }

  room.refCount -= 1;

  if (room.refCount > 0) {
    return;
  }

  setTimeout(() => {
    const current = rooms.get(documentId);

    if (!current || current.refCount > 0) {
      return;
    }

    if (current.saveTimer) {
      clearTimeout(current.saveTimer);
      current.saveTimer = null;
    }

    // Force a checkpoint on session end when there are unsaved edits, so
    // every editing session leaves a restorable version. If nothing changed
    // since the last save, the last snapshot already covers this state.
    const flush = current.dirty
      ? persist(documentId, current, "force")
      : Promise.resolve();

    flush
      .catch((error) =>
        console.error(`Failed to flush document ${documentId} on evict`, error)
      )
      .finally(() => {
        current.ydoc.destroy();
        rooms.delete(documentId);
      });
  }, EVICT_GRACE_MS);
}
