import type { AppEvent } from "@clean-chat/core";
import { useEffect, useRef, useState } from "react";
import { useClient } from "@/lib/client-context";

/**
 * Run a query use case, then re-run it when {@link eventType} is published.
 * Returns `undefined` until the first result (skeletons). Changing
 * {@link filterChannelId} resets to `undefined`. Channel-scoped events
 * whose `channelId` does not match are ignored.
 *
 * Overlapping fetches keep only the latest in-flight result so a slower
 * older list cannot overwrite a newer one (e.g. presence join then a
 * stale empty list).
 */
export function useLiveQuery<T>(
  load: () => Promise<T>,
  eventType: AppEvent["type"],
  filterChannelId?: string,
): T | undefined {
  const client = useClient();
  const [data, setData] = useState<T | undefined>(undefined);
  const [channelKey, setChannelKey] = useState(filterChannelId);
  const loadRef = useRef(load);

  if (channelKey !== filterChannelId) {
    setChannelKey(filterChannelId);
    setData(undefined);
  }

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let cancelled = false;
    let seq = 0;

    function refresh() {
      const thisSeq = ++seq;
      void loadRef.current().then(
        (value) => {
          if (!cancelled && thisSeq === seq) {
            setData(value);
          }
        },
        () => {
          /* Keep the previous snapshot; skeletons only on first load. */
        },
      );
    }

    refresh();
    const unsubscribe = client.eventSubscriber.subscribe(eventType, (event) => {
      if (
        filterChannelId !== undefined &&
        "channelId" in event &&
        event.channelId !== filterChannelId
      ) {
        return;
      }
      refresh();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [client, eventType, filterChannelId]);

  return data;
}
