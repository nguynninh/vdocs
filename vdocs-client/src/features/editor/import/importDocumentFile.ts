import { documentApi } from "../data/api/documentApi";
import type { ImportDocumentResult, ImportDocumentValues } from "@/src/components/layout/ImportDocumentDialog";
import { parseMarkdownToBlocks } from "./markdownToBlocks";
import { setPendingImportBlocks } from "./pendingImport";

const MARKDOWN_EXTENSIONS = ["md", "markdown", "txt"];

/** Handles the only import source implemented so far: a `.md`/`.markdown`/
 * `.txt` file picked from disk. Creates the document, parses the file into
 * blocks, and stashes them for `EditorProvider` to apply once the new
 * document's collaboration room is joined (see `pendingImport.ts`). */
export async function importDocumentFile(
  values: ImportDocumentValues,
  workspaceId?: string
): Promise<ImportDocumentResult> {
  if (values.source !== "device" || !values.file) {
    throw new Error("Only importing a file from your device is supported right now.");
  }

  const extension = values.file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!MARKDOWN_EXTENSIONS.includes(extension)) {
    throw new Error("Only .md, .markdown, and .txt files are supported right now.");
  }

  const markdown = await values.file.text();
  const blocks = parseMarkdownToBlocks(markdown);
  const title = values.file.name.replace(/\.[^./]+$/, "");

  const response = await documentApi.create(title, workspaceId, values.parentDocumentId);
  const documentId = response.data.id;

  if (blocks.length) {
    setPendingImportBlocks(documentId, blocks);
  }

  return { documentId };
}
