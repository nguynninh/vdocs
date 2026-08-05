import type { ConnectionState } from "../collaboration.types";

const LABEL: Record<ConnectionState, string> = {
  idle: "",
  connecting: "Connecting…",
  connected: "Connected",
  reconnecting: "Reconnecting…",
  offline: "Offline",
  error: "Connection error",
};

export interface ConnectionStatusProps {
  state: ConnectionState;
}

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  if (state === "idle" || state === "connected") {
    return null;
  }

  return (
    <span role="status" aria-live="polite">
      {LABEL[state]}
    </span>
  );
}
