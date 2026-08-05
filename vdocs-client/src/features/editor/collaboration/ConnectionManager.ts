import { io, type Socket } from "socket.io-client";
import type { ConnectionState } from "./collaboration.types";

/**
 * Owns the raw Socket.IO connection lifecycle. Knows nothing about
 * documents or Yjs — just translates socket events into ConnectionState.
 */
export class ConnectionManager {
  private socket: Socket | null = null;
  private state: ConnectionState = "idle";
  private readonly listeners = new Set<(state: ConnectionState) => void>();

  constructor(private readonly realtimeUrl: string) {}

  getSocket(): Socket {
    if (!this.socket) {
      this.socket = io(this.realtimeUrl, {
        path: "/realtime",
        transports: ["websocket"],
        withCredentials: true,
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionDelayMax: 10_000,
      });

      this.bindEvents(this.socket);
    }

    return this.socket;
  }

  connect(): void {
    const socket = this.getSocket();

    if (socket.connected) {
      return;
    }

    this.setState("connecting");
    socket.connect();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.setState("idle");
  }

  getState(): ConnectionState {
    return this.state;
  }

  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }

  private bindEvents(socket: Socket): void {
    socket.on("connect", () => this.setState("connected"));

    socket.on("disconnect", () => {
      const isOnline = typeof navigator === "undefined" || navigator.onLine;
      this.setState(isOnline ? "reconnecting" : "offline");
    });

    socket.io.on("reconnect_attempt", () => this.setState("reconnecting"));
    socket.on("connect_error", () => this.setState("error"));
  }
}
