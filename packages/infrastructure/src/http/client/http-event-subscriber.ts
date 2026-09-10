import type { AppEvent, EventSubscriber } from "@clean-chat/core";

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

function consumeSseFrames(
  buf: string,
  onData: (value: unknown) => void,
): string {
  let remaining = buf;
  while (true) {
    const sep = remaining.indexOf("\n\n");
    if (sep === -1) {
      return remaining;
    }
    const frame = remaining.slice(0, sep);
    remaining = remaining.slice(sep + 2);
    for (const line of frame.split("\n")) {
      if (line.startsWith("data:")) {
        onData(JSON.parse(line.slice(5).trimStart()) as unknown);
      }
    }
  }
}

async function readSse(
  url: string,
  signal: AbortSignal,
  onData: (value: unknown) => void,
): Promise<void> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${String(res.status)}`);
  }
  if (!res.body) {
    throw new Error("SSE response has no body");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buf = consumeSseFrames(
        buf + decoder.decode(value, { stream: true }),
        onData,
      );
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Driving adapter: each {@link EventSubscriber.subscribe} opens
 * `GET {baseUrl}/{type}` as SSE and forwards `data:` JSON frames.
 * `Unsubscribe` aborts the request. Failed streams end without retry.
 */
export function createHttpEventSubscriber(baseUrl: string): EventSubscriber {
  const root = baseUrl.replace(/\/+$/, "");
  return {
    subscribe(type, handler) {
      const ac = new AbortController();
      void readSse(`${root}/${type}`, ac.signal, (value) => {
        handler(value as Extract<AppEvent, { type: typeof type }>);
      }).catch((err: unknown) => {
        if (ac.signal.aborted || isAbortError(err)) {
          return;
        }
      });
      return () => {
        ac.abort();
      };
    },
  };
}
