import { createDocument } from "../document/createDocument";
import type { EditorState } from "./editorState.types";

export function createEditorState(): EditorState {
  const document = createDocument();
  return { document, focusBlockId: document.blocks[0].id };
}
