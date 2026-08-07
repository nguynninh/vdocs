export interface DocumentMetadataUpdatedEvent {
  documentId: string;
  title?: string;
  icon?: string;
}

type Listener = (event: DocumentMetadataUpdatedEvent) => void;

const listeners = new Set<Listener>();

export function emitDocumentMetadataUpdated(event: DocumentMetadataUpdatedEvent) {
  listeners.forEach((listener) => listener(event));
}

export function onDocumentMetadataUpdated(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
