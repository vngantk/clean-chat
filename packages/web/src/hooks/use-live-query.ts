import type { AppEvent } from "@clean-chat/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClient } from "@/lib/client-context";
import { errorMessage } from "@/lib/error-message";

export type LiveQueryStatus = "loading" | "success" | "error";

export type LiveQueryResult<T> = {
  data: T | undefined;
  error: string | undefined;
  status: LiveQueryStatus;
  retry: () => void;
};

/**
 * Run a query use case, then re-run it when {@link eventType} is published.
 * Status is `loading` until the first result (skeletons). Changing
 * {@link filterChannelId} resets to `loading`. Channel-scoped events
 * whose `channelId` does not match are ignored.
 *
 * Overlapping fetches keep only the latest in-flight result so a slower
 * older list cannot overwrite a newer one (e.g. presence join then a
 * stale empty list). First-load failure surfaces `error` with no data.
 * A later failure keeps the last successful snapshot and sets `error`.
 */
export function useLiveQuery<T>(
  load: () => Promise<T>,
  eventType: AppEvent["type"],
  filterChannelId?: string,
): LiveQueryResult<T> {
  const client = useClient();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<LiveQueryStatus>("loading");
  const [channelKey, setChannelKey] = useState(filterChannelId);
  const loadRef = useRef(load);
  const hadSuccessRef = useRef(false);
  const refreshRef = useRef<() => void>(() => undefined);

  if (channelKey !== filterChannelId) {
    setChannelKey(filterChannelId);
    setData(undefined);
    setError(undefined);
    setStatus("loading");
  }

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let cancelled = false;
    let seq = 0;
    hadSuccessRef.current = false;

    function refresh() {
      const thisSeq = ++seq;
      void loadRef.current().then(
        (value) => {
          if (!cancelled && thisSeq === seq) {
            hadSuccessRef.current = true;
            setData(value);
            setError(undefined);
            setStatus("success");
          }
        },
        (err: unknown) => {
          if (!cancelled && thisSeq === seq) {
            setError(errorMessage(err, "Could not load."));
            if (!hadSuccessRef.current) {
              setData(undefined);
            }
            setStatus("error");
          }
        },
      );
    }

    refreshRef.current = refresh;
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

  const retry = useCallback(() => {
    refreshRef.current();
  }, []);

  return { data, error, status, retry };
}
