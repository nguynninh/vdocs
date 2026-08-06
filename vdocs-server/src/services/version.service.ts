import * as Y from "yjs";
import { versionRepository } from "../repositories/version.repository.ts";
import {
  DocumentNotFoundError,
  DocumentForbiddenError,
  canEdit,
} from "./document.service.ts";
import { documentRepository } from "../repositories/document.repository.ts";
import { getDocumentPermission } from "./document.service.ts";
import { encodeState } from "../realtime/documentRoomManager.ts";

export class VersionNotFoundError extends Error {}

async function requireReadAccess(documentId: string, userId: string | null) {
  const document = await documentRepository.findById(documentId);

  if (!document) {
    throw new DocumentNotFoundError(`Document ${documentId} not found`);
  }

  const permission = await getDocumentPermission(document, userId);

  if (!permission) {
    throw new DocumentForbiddenError(
      `${userId ? `User ${userId}` : "Anonymous visitor"} has no access to document ${documentId}`
    );
  }

  return { document, permission };
}

/**
 * Decodes a raw Yjs state buffer into a plain, read-only preview. Mirrors
 * the shared-type layout defined by the client's YjsCollaborativeDocument
 * (blocks: Y.Array<Y.Map>, metadata: Y.Map) without depending on it.
 */
function decodeSnapshot(state: Uint8Array) {
  const ydoc = new Y.Doc();

  if (state.length > 0) {
    Y.applyUpdate(ydoc, state, "version-preview");
  }

  const blocksArray = ydoc.getArray<Y.Map<unknown>>("blocks");
  const metadata = ydoc.getMap<unknown>("metadata");

  const blocks = [];
  for (let index = 0; index < blocksArray.length; index += 1) {
    const block = blocksArray.get(index);
    blocks.push({
      id: block.get("id") as string,
      type: block.get("type") as string,
      text: (block.get("text") as Y.Text).toString(),
    });
  }

  const preview = {
    blocks,
    fullWidth: (metadata.get("fullWidth") as boolean | undefined) ?? false,
    fontStyle: (metadata.get("fontStyle") as string | undefined) ?? "default",
    smallText: (metadata.get("smallText") as boolean | undefined) ?? false,
  };

  ydoc.destroy();
  return preview;
}

async function listVersions(documentId: string, userId: string | null) {
  await requireReadAccess(documentId, userId);

  const versions = await versionRepository.listForDocument(documentId);

  return versions.map((version) => ({
    id: version.id,
    trigger: version.trigger as "auto" | "manual" | "daily",
    label: version.label,
    contentVersion: version.contentVersion,
    createdAt: version.createdAt,
    createdBy: version.creator
      ? { id: version.creator.id, name: version.creator.name }
      : null,
  }));
}

async function getVersion(documentId: string, versionId: string, userId: string | null) {
  await requireReadAccess(documentId, userId);

  const version = await versionRepository.findById(documentId, versionId);

  if (!version) {
    throw new VersionNotFoundError(`Version ${versionId} not found`);
  }

  return {
    id: version.id,
    trigger: version.trigger as "auto" | "manual" | "daily",
    label: version.label,
    contentVersion: version.contentVersion,
    createdAt: version.createdAt,
    createdBy: version.creator
      ? { id: version.creator.id, name: version.creator.name }
      : null,
    content: decodeSnapshot(new Uint8Array(version.ydocState)),
  };
}

async function createManualVersion(
  documentId: string,
  userId: string,
  label?: string
) {
  const { document, permission } = await requireReadAccess(documentId, userId);

  if (!canEdit(permission)) {
    throw new DocumentForbiddenError(
      `User ${userId} cannot save a version for document ${documentId}`
    );
  }

  // Prefer the live in-memory room (has the latest unsaved edits); fall back
  // to the last persisted blob when no one currently has the document open.
  const liveState = encodeState(documentId);
  const state = Buffer.from(
    liveState.length > 0 ? liveState : (document.ydocState ?? new Uint8Array())
  );

  const version = await versionRepository.create({
    documentId,
    ydocState: state,
    contentVersion: document.contentVersion,
    trigger: "manual",
    label,
    createdBy: userId,
  });

  return {
    id: version.id,
    trigger: version.trigger as "auto" | "manual" | "daily",
    label: version.label,
    contentVersion: version.contentVersion,
    createdAt: version.createdAt,
    createdBy: version.creator
      ? { id: version.creator.id, name: version.creator.name }
      : null,
  };
}

export const versionService = {
  listVersions,
  getVersion,
  createManualVersion,
};
