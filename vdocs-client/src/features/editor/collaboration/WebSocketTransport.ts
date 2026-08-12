import type { ConnectionManager } from "./ConnectionManager";
import type {
  CollaborationTransport,
  JoinResult,
  UpdateAck,
} from "./collaboration.types";

interface RemoteUpdatePayload {
  documentId: string;
  update: Uint8Array;
}

interface JoinAck extends JoinResult {
  error?: { code: string; message: string };
}

/**
 * Document-level protocol layered on top of ConnectionManager's socket.
 * Sees only `Uint8Array`/acks — never imports `yjs`.
 */
export class WebSocketTransport implements CollaborationTransport {
  private documentId: string | null = null;
  private readonly remoteUpdateListeners = new Set<(update: Uint8Array) => void>();

  private readonly handleRemoteUpdate = (payload: RemoteUpdatePayload): void => {
    if (payload.documentId !== this.documentId) {
      return;
    }

    const update = new Uint8Array(payload.update);
    this.remoteUpdateListeners.forEach((listener) => listener(update));
  };

  constructor(private readonly connectionManager: ConnectionManager) {
    this.connectionManager
      .getSocket()
      .on("document:update", this.handleRemoteUpdate);
  }

  connect(): Promise<void> {
    return new Promise((resolve) => {
      const socket = this.connectionManager.getSocket();

      if (socket.connected) {
        resolve();
        return;
      }

      socket.once("connect", () => resolve());
      this.connectionManager.connect();
    });
  }

  joinDocument(
    documentId: string,
    _knownVersion: number,
    shareToken?: string,
    workspaceShareToken?: string
  ): Promise<JoinResult> {
    this.documentId = documentId;

    return new Promise((resolve, reject) => {
      this.connectionManager
        .getSocket()
        .emit("document:join", { documentId, shareToken, workspaceShareToken }, (ack: JoinAck) => {
          if (!ack.success) {
            reject(new Error(ack.error?.message ?? "Failed to join document"));
            return;
          }

          resolve(ack);
        });
    });
  }

  sendUpdate(update: Uint8Array): Promise<UpdateAck> {
    if (!this.documentId) {
      return Promise.resolve({ success: false });
    }

    return new Promise((resolve) => {
      this.connectionManager
        .getSocket()
        .timeout(5_000)
        .emit(
          "document:update",
          { documentId: this.documentId, update },
          (err: Error | null, ack?: UpdateAck) => {
            resolve(err || !ack ? { success: false } : ack);
          }
        );
    });
  }

  onRemoteUpdate(listener: (update: Uint8Array) => void): () => void {
    this.remoteUpdateListeners.add(listener);
    return () => this.remoteUpdateListeners.delete(listener);
  }

  restoreVersion(documentId: string, versionId: string): Promise<UpdateAck> {
    return new Promise((resolve) => {
      this.connectionManager
        .getSocket()
        .timeout(10_000)
        .emit(
          "document:restoreVersion",
          { documentId, versionId },
          (err: Error | null, ack?: UpdateAck) => {
            resolve(err || !ack ? { success: false } : ack);
          }
        );
    });
  }

  disconnect(): void {
    if (this.documentId) {
      this.connectionManager
        .getSocket()
        .emit("document:leave", { documentId: this.documentId });
    }

    this.connectionManager.getSocket().off("document:update", this.handleRemoteUpdate);
    this.documentId = null;
  }
}
