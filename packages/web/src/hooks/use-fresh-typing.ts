import type { Typing } from "@clean-chat/core/domain";
import { TYPING_EXPIRE_MS } from "@clean-chat/core/domain";
import { useEffect, useState } from "react";

/**
 * Other users still typing in this channel. Hides rows whose `updatedAt` is
 * older than {@link TYPING_EXPIRE_MS} and schedules a re-render at the next
 * expiry so the line clears without a new SSE event.
 */
export function useFreshTyping(
  typing: Typing[] | undefined,
  viewerId: string,
): Typing[] {
  const [others, setOthers] = useState<Typing[]>([]);

  useEffect(() => {
    if (typing === undefined) {
      setOthers([]);
      return;
    }

    const rows = typing;
    let timer: number | undefined;

    function tick() {
      const now = Date.now();
      const fresh = rows.filter(
        (entry) =>
          entry.userId !== viewerId && now - entry.updatedAt < TYPING_EXPIRE_MS,
      );
      setOthers(fresh);
      if (fresh.length === 0) {
        return;
      }
      const nextExpiry = Math.min(
        ...fresh.map((entry) => entry.updatedAt + TYPING_EXPIRE_MS),
      );
      timer = window.setTimeout(tick, Math.max(0, nextExpiry - now));
    }

    tick();
    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [typing, viewerId]);

  return others;
}
