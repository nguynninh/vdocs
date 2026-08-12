import { ConnectionManager } from "./ConnectionManager";
import { WebSocketTransport } from "./WebSocketTransport";
import { RoomManager } from "./RoomManager";
import { YjsCollaborativeDocument } from "./YjsCollaborativeDocument";
import type {
  CollaborativeDocument,
  ConnectionState,
  DocumentPermission,
} from "./collaboration.types";

export interface CollaborationProviderOptions {
  realtimeUrl: string;
  documentId: string;
  shareToken?: string;
  workspaceShareToken?: string;
  initialState?: Uint8Array;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onPermission?: (permission: DocumentPermission) => void;
  onError?: (error: unknown) => void;
}

/**
 * Orchestrates ConnectionManager + WebSocketTransport + RoomManager +
 * YjsCollaborativeDocument for one open document. This is the only place
 * the rest of the editor needs to know about to get collaboration —
 * everything else in this folder is an implementation detail behind it.
 */
export class CollaborationProvider {
  readonly document: CollaborativeDocument;
  private readonly connectionManager: ConnectionManager;
  private readonly transport: WebSocketTransport;
  private readonly roomManager: RoomManager;
  private unsubscribeLocalUpdate: (() => void) | null = null;
  private unsubscribeRemoteUpdate: (() => void) | null = null;
  private unsubscribeConnectionState: (() => void) | null = null;
  private started = false;
  private stopped = false;

  constructor(private readonly options: CollaborationProviderOptions) {
    this.document = new YjsCollaborativeDocument(options.initialState);
    this.connectionManager = new ConnectionManager(options.realtimeUrl);
    this.transport = new WebSocketTransport(this.connectionManager);
    this.roomManager = new RoomManager(
      this.connectionManager,
      this.transport,
      (result) => {
        if (result.update?.length) {
          this.document.applyRemoteUpdate(new Uint8Array(result.update));
        }

        if (result.permission) {
          this.options.onPermission?.(result.permission);
        }
      },
      (error) => this.options.onError?.(error)
    );
  }

  /** Restores the document to an older version; the diff arrives back
   * through the normal remote-update path once the server broadcasts it. */
  restoreVersion(versionId: string): Promise<boolean> {
    return this.transport
      .restoreVersion(this.options.documentId, versionId)
      .then((ack) => ack.success);
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;

    this.unsubscribeConnectionState = this.connectionManager.onStateChange((state) =>
      this.options.onConnectionStateChange?.(state)
    );

    this.unsubscribeLocalUpdate = this.document.onLocalUpdate((update) => {
      void this.transport.sendUpdate(update).then((ack) => {
        if (!ack.success) {
          this.options.onError?.(new Error("Update rejected by server"));
        }
      });
    });

    this.unsubscribeRemoteUpdate = this.transport.onRemoteUpdate((update) => {
      this.document.applyRemoteUpdate(update);
    });

    try {
      await this.transport.connect();
      // React Strict Mode's dev-only mount→unmount→mount can call stop()
      // while this was suspended above — don't let a stale instance join
      // (and keep receiving broadcasts) after it's supposed to be dead.
      if (this.stopped) {
        return;
      }

      await this.roomManager.join(
        this.options.documentId,
        this.options.shareToken,
        this.options.workspaceShareToken
      );
    } catch (error) {
      if (!this.stopped) {
        this.options.onError?.(error);
      }
    }
  }

  stop(): void {
    this.stopped = true;
    this.roomManager.leave();
    this.unsubscribeLocalUpdate?.();
    this.unsubscribeRemoteUpdate?.();
    this.unsubscribeConnectionState?.();
    this.connectionManager.disconnect();
    this.document.destroy();
  }
}
