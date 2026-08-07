import type { ImportBlock } from "./markdownToBlocks";

/** Bridges a document import (done before the target document's page ever
 * mounts) to `EditorProvider`'s seed-block effect: the importer stashes the
 * parsed blocks here right after creating the document, then navigates, and
 * `EditorProvider` claims them once it joins the collaboration room instead
 * of seeding the usual empty paragraph. */
const pendingImports = new Map<string, ImportBlock[]>();

export function setPendingImportBlocks(documentId: string, blocks: ImportBlock[]): void {
  pendingImports.set(documentId, blocks);
}

export function takePendingImportBlocks(documentId: string): ImportBlock[] | undefined {
  const blocks = pendingImports.get(documentId);
  pendingImports.delete(documentId);
  return blocks;
}
