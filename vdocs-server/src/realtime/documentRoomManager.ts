import * as Y from "yjs";
import { prisma } from "../configuration/prisma.ts";

interface RoomState {
  ydoc: Y.Doc;
  dirty: boolean;
  saveTimer: NodeJS.Timeout | null;
  refCount: number;
}

// Single-node Phase 1: hold one Y.Doc per open document in memory, debounce
// writes to Postgres. No update log / snapshot worker — deferred to Phase 3.
const SAVE_DEBOUNCE_MS = 2_500;
const EVICT_GRACE_MS = 5_000;

const rooms = new Map<string, RoomState>();

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

async function persist(documentId: string, room: RoomState): Promise<void> {
  room.dirty = false;

  const state = Buffer.from(Y.encodeStateAsUpdate(room.ydoc));

  await prisma.document.update({
    where: { id: documentId },
    data: {
      ydocState: state,
      contentVersion: { increment: 1 },
    },
  });
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
    room = { ydoc, dirty: false, saveTimer: null, refCount: 0 };
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

    const flush = current.dirty
      ? persist(documentId, current)
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
