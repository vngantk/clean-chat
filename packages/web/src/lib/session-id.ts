/**
 * Stable per-tab id for presence heartbeats.
 *
 * Kept in module scope (not `sessionStorage`) so React StrictMode remounts
 * reuse it, but a duplicated browser tab — which copies `sessionStorage` —
 * still gets its own id and cannot disconnect the other tab’s presence.
 */
let tabPresenceSessionId: string | undefined;

export function tabSessionId(): string {
  if (tabPresenceSessionId === undefined) {
    tabPresenceSessionId = crypto.randomUUID();
  }
  return tabPresenceSessionId;
}
