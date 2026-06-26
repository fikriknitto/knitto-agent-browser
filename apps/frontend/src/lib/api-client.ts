const WS_PATH = "/ws";

/** Connect via same origin (Vite proxies /ws → backend) or direct host:port. */
export function   resolveWsUrl(host: string, port: string, useWss = false): string {
  const scheme = useWss ? "wss" : "ws";
  const resolvedHost = host.trim() || "localhost";
  const resolvedPort = port.trim() || "3080";
  return `${scheme}://${resolvedHost}:${resolvedPort}${WS_PATH}`;
}
