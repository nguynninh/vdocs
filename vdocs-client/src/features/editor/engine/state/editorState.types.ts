import type { DocumentModel } from "../document/document.types";

export interface EditorState {
  document: DocumentModel;
  focusBlockId: string | null;
}
