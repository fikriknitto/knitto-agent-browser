const WS_PATH = "/ws";

/** WebSocket URL on backend host:port (direct, not proxied). */
export function resolveWsUrl(host: string, port: string, useWss = false): string {
  const scheme = useWss ? "wss" : "ws";
  const resolvedHost = host.trim() || "localhost";
  const resolvedPort = port.trim() || "3080";
  return `${scheme}://${resolvedHost}:${resolvedPort}${WS_PATH}`;
}
