import type http from "node:http";
import { Server, type DefaultEventsMap } from "socket.io";
import { documentRepository } from "../repositories/document.repository.ts";
import { canEdit, getDocumentPermission } from "../services/document.service.ts";
import type { DocumentPermission } from "../dtos/response/DocumentPermission.ts";
import {
  socketAuthMiddleware,
  type RealtimeSocket,
  type RealtimeSocketData,
} from "./socketAuth.middleware.ts";
import {
  acquireRoom,
  applyRemoteUpdate,
  encodeState,
  releaseRoom,
} from "./documentRoomManager.ts";

const MAX_UPDATE_BYTES = 64 * 1024;

interface JoinPayload {
  documentId: string;
}

interface UpdatePayload {
  documentId: string;
  update: Uint8Array;
}

interface LeavePayload {
  documentId: string;
}

interface JoinAck {
  success: boolean;
  permission?: DocumentPermission;
  update?: Uint8Array;
  error?: { code: string; message: string };
}

interface UpdateAck {
  success: boolean;
  error?: { code: string; message: string };
}

function roomName(documentId: string): string {
  return `document:${documentId}`;
}

export function createRealtimeServer(httpServer: http.Server) {
  const io = new Server<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap,
    RealtimeSocketData
  >(httpServer, {
    path: "/realtime",
    cors: {
      origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
      credentials: true,
    },
    maxHttpBufferSize: MAX_UPDATE_BYTES,
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket: RealtimeSocket) => {
    socket.on(
      "document:join",
      async (payload: JoinPayload, callback: (ack: JoinAck) => void) => {
        try {
          const document = await documentRepository.findById(payload.documentId);

          if (!document) {
            callback({
              success: false,
              error: { code: "DOCUMENT_NOT_FOUND", message: "Document not found" },
            });
            return;
          }

          const permission = await getDocumentPermission(
            document,
            socket.data.user?.id ?? null
          );

          if (!permission) {
            callback({
              success: false,
              error: { code: "FORBIDDEN", message: "No access to this document" },
            });
            return;
          }

          await socket.join(roomName(payload.documentId));
          socket.data.joinedDocuments.add(payload.documentId);
          await acquireRoom(payload.documentId);

          callback({
            success: true,
            permission,
            update: encodeState(payload.documentId),
          });
        } catch (error) {
          console.error("document:join failed", error);
          callback({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to join document" },
          });
        }
      }
    );

    socket.on(
      "document:update",
      async (payload: UpdatePayload, callback?: (ack: UpdateAck) => void) => {
        try {
          if (!socket.data.joinedDocuments.has(payload.documentId)) {
            callback?.({
              success: false,
              error: { code: "FORBIDDEN", message: "Join the document first" },
            });
            return;
          }

          if (!(payload.update instanceof Uint8Array)) {
            callback?.({
              success: false,
              error: { code: "INVALID_PAYLOAD", message: "Update must be binary" },
            });
            return;
          }

          const document = await documentRepository.findById(payload.documentId);

          if (!document) {
            callback?.({
              success: false,
              error: { code: "DOCUMENT_NOT_FOUND", message: "Document not found" },
            });
            return;
          }

          const permission = await getDocumentPermission(
            document,
            socket.data.user?.id ?? null
          );

          if (!permission || !canEdit(permission)) {
            callback?.({
              success: false,
              error: { code: "FORBIDDEN", message: "You cannot edit this document" },
            });
            return;
          }

          applyRemoteUpdate(payload.documentId, payload.update);
          callback?.({ success: true });

          socket.to(roomName(payload.documentId)).emit("document:update", {
            documentId: payload.documentId,
            update: payload.update,
          });
        } catch (error) {
          console.error("document:update failed", error);
          callback?.({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to apply update" },
          });
        }
      }
    );

    function leaveDocument(documentId: string) {
      if (!socket.data.joinedDocuments.has(documentId)) {
        return;
      }

      socket.data.joinedDocuments.delete(documentId);
      socket.leave(roomName(documentId));
      releaseRoom(documentId);
    }

    socket.on("document:leave", (payload: LeavePayload) => {
      leaveDocument(payload.documentId);
    });

    socket.on("disconnecting", () => {
      for (const documentId of socket.data.joinedDocuments) {
        leaveDocument(documentId);
      }
    });
  });

  return io;
}
