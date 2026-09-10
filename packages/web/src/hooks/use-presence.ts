import type { Presence } from "@clean-chat/core/domain";
import { useEffect, useRef } from "react";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useClient } from "@/lib/client-context";
import { tabSessionId } from "@/lib/session-id";

/** Same interval as `@convex-dev/presence` (10s). */
export const PRESENCE_HEARTBEAT_MS = 10_000;

/**
 * Delay disconnect on effect cleanup so React StrictMode remounts do not
 * drop this tab from the room. Timers are keyed by channel so switching
 * rooms still leaves the previous one.
 */
const PRESENCE_DISCONNECT_DELAY_MS = 250;

/**
 * Heartbeat this tab in `channelId`, list online rows, and disconnect on
 * unmount / channel change / `pagehide`. List updates on `presence-changed`
 * (join/leave), not on every tick.
 */
export function usePresence(channelId: string): Presence[] | undefined {
  const client = useClient();
  const disconnectTimersRef = useRef(new Map<string, number>());
  const previousChannelRef = useRef<string | undefined>(undefined);
  const presence = useLiveQuery(
    () => client.listPresence.execute({ channelId }),
    "presence-changed",
    channelId,
  );

  useEffect(() => {
    const sessionId = tabSessionId();
    const timers = disconnectTimersRef.current;
    const previous = previousChannelRef.current;
    previousChannelRef.current = channelId;

    function cancelTimer(id: string) {
      const timer = timers.get(id);
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timers.delete(id);
      }
    }

    function disconnect(id: string) {
      cancelTimer(id);
      void client.disconnectPresence.execute({
        channelId: id,
        sessionId,
      });
    }

    if (previous !== undefined && previous !== channelId) {
      disconnect(previous);
    }
    cancelTimer(channelId);

    function beat() {
      void client.heartbeatPresence.execute({ channelId, sessionId });
    }

    beat();
    const interval = window.setInterval(beat, PRESENCE_HEARTBEAT_MS);

    function onPageHide() {
      for (const id of Array.from(timers.keys())) {
        disconnect(id);
      }
      void client.disconnectPresence.execute({ channelId, sessionId });
    }
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", onPageHide);
      const leaving = channelId;
      const timer = window.setTimeout(() => {
        timers.delete(leaving);
        void client.disconnectPresence.execute({
          channelId: leaving,
          sessionId,
        });
      }, PRESENCE_DISCONNECT_DELAY_MS);
      timers.set(leaving, timer);
    };
  }, [client, channelId]);

  return presence;
}
