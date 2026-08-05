import { parseCookie } from "cookie";
import type { DefaultEventsMap, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt.ts";

export interface RealtimeUser {
  id: string;
  [key: string]: unknown;
}

export interface RealtimeSocketData {
  user: RealtimeUser | null;
  joinedDocuments: Set<string>;
}

export type RealtimeSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  RealtimeSocketData
>;

/**
 * Lets sockets connect anonymously — actual document access (view-only for
 * anonymous visitors, gated by linkAccess) is enforced per-document in
 * createRealtimeServer.ts, not here.
 */
export function socketAuthMiddleware(
  socket: RealtimeSocket,
  next: (error?: Error) => void
): void {
  socket.data.user = null;
  socket.data.joinedDocuments = new Set();

  const cookieHeader = socket.handshake.headers.cookie;
  const accessToken = cookieHeader ? parseCookie(cookieHeader).accessToken : undefined;

  if (!accessToken) {
    next();
    return;
  }

  try {
    const { iat, exp, ...user } = verifyToken(accessToken);

    if (typeof user.id === "string") {
      socket.data.user = user as RealtimeUser;
    }
  } catch {
    // Invalid/expired token — proceed as anonymous.
  }

  next();
}
