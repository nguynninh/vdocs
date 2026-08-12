import type { ConnectionManager } from "./ConnectionManager";
import type { CollaborationTransport, JoinResult } from "./collaboration.types";

/**
 * Keeps a document "joined" across reconnects. Server-side room membership
 * lives on the socket connection, so a dropped connection loses it — this
 * re-joins automatically whenever ConnectionManager reports "connected"
 * again after the initial join.
 */
export class RoomManager {
  private documentId: string | null = null;
  private shareToken: string | undefined;
  private unsubscribeConnection: (() => void) | null = null;

  constructor(
    private readonly connectionManager: ConnectionManager,
    private readonly transport: CollaborationTransport,
    private readonly onJoined: (result: JoinResult) => void,
    private readonly onRejoinFailed: (error: unknown) => void
  ) {}

  async join(documentId: string, shareToken?: string): Promise<JoinResult> {
    this.documentId = documentId;
    this.shareToken = shareToken;

    if (!this.unsubscribeConnection) {
      this.unsubscribeConnection = this.connectionManager.onStateChange((state) => {
        if (state === "connected" && this.documentId) {
          this.rejoin(this.documentId);
        }
      });
    }

    const result = await this.transport.joinDocument(documentId, 0, shareToken);
    this.onJoined(result);
    return result;
  }

  private rejoin(documentId: string): void {
    this.transport
      .joinDocument(documentId, 0, this.shareToken)
      .then((result) => this.onJoined(result))
      .catch((error) => this.onRejoinFailed(error));
  }

  leave(): void {
    this.documentId = null;
    this.unsubscribeConnection?.();
    this.unsubscribeConnection = null;
    this.transport.disconnect();
  }
}
