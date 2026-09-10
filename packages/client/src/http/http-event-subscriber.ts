import type { AppEvent, EventSubscriber } from "@clean-chat/core";
import {
  isSseAuthFailure,
  throwHttpError,
} from "./http-error.js";

/** First reconnect wait; doubles each attempt up to {@link SSE_RECONNECT_MAX_MS}. */
export const SSE_RECONNECT_BASE_MS = 500;

/** Cap on SSE reconnect backoff. */
export const SSE_RECONNECT_MAX_MS = 10_000;

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
  getHeaders?: () => Record<string, string>,
): Promise<void> {
  const res = await fetch(url, {
    signal,
    headers: getHeaders?.() ?? {},
  });
  if (!res.ok) {
    await throwHttpError(res);
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

function reconnectDelay(attempt: number, overrideMs?: number): number {
  if (overrideMs !== undefined) {
    return overrideMs;
  }
  return Math.min(
    SSE_RECONNECT_MAX_MS,
    SSE_RECONNECT_BASE_MS * 2 ** Math.min(attempt - 1, 5),
  );
}

function waitForReconnect(
  ms: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function isAppEvent(value: unknown): value is AppEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as { type: unknown }).type === "string"
  );
}

export type HttpEventSubscriberOptions = {
  getHeaders?: () => Record<string, string>;
  /**
   * Fixed wait before reconnecting after a dropped stream. When omitted,
   * waits {@link SSE_RECONNECT_BASE_MS} and doubles each attempt up to
   * {@link SSE_RECONNECT_MAX_MS}.
   */
  reconnectDelayMs?: number;
  /** Called when `GET` returns 401/403. The stream does not reconnect. */
  onUnauthorized?: () => void;
};

/**
 * Driving adapter: one multiplexed `GET {baseUrl}` SSE stream (all
 * `AppEvent` types). {@link EventSubscriber.subscribe} registers a
 * type-filtered handler on that shared connection so a tab does not open
 * four long-lived HTTP/1.1 sockets (the browser allows six per origin).
 * `Unsubscribe` of the last handler aborts the stream. Dropped streams
 * reconnect with backoff until every handler is gone. {@link close}
 * aborts immediately (sign-out / 401).
 */
export type HttpEventSubscriber = EventSubscriber & {
  close(): void;
};

export function createHttpEventSubscriber(
  baseUrl: string,
  options?: HttpEventSubscriberOptions,
): HttpEventSubscriber {
  const root = baseUrl.replace(/\/+$/, "");
  const handlers = new Map<AppEvent["type"], Set<(event: AppEvent) => void>>();
  let stream: AbortController | undefined;

  function handlerCount(): number {
    let n = 0;
    for (const set of handlers.values()) {
      n += set.size;
    }
    return n;
  }

  function dispatch(value: unknown): void {
    if (!isAppEvent(value)) {
      return;
    }
    const set = handlers.get(value.type);
    if (set === undefined) {
      return;
    }
    for (const handler of set) {
      handler(value);
    }
  }

  function startStream(): void {
    if (stream !== undefined) {
      return;
    }
    const ac = new AbortController();
    stream = ac;
    const getHeaders = options?.getHeaders ?? (() => ({}));
    void (async () => {
      let attempt = 0;
      while (!ac.signal.aborted) {
        try {
          await readSse(root, ac.signal, dispatch, getHeaders);
          if (ac.signal.aborted) {
            return;
          }
          attempt += 1;
        } catch (err: unknown) {
          if (ac.signal.aborted || isAbortError(err)) {
            return;
          }
          if (isSseAuthFailure(err)) {
            stopStream();
            options?.onUnauthorized?.();
            return;
          }
          attempt += 1;
        }
        const delay =
          options?.reconnectDelayMs !== undefined
            ? reconnectDelay(attempt, options.reconnectDelayMs)
            : reconnectDelay(attempt);
        await waitForReconnect(delay, ac.signal);
      }
    })();
  }

  function stopStream(): void {
    stream?.abort();
    stream = undefined;
  }

  return {
    subscribe(type, handler) {
      let set = handlers.get(type);
      if (set === undefined) {
        set = new Set();
        handlers.set(type, set);
      }
      const wrapped = handler as (event: AppEvent) => void;
      set.add(wrapped);
      startStream();
      return () => {
        set.delete(wrapped);
        if (handlerCount() === 0) {
          stopStream();
        }
      };
    },
    close() {
      handlers.clear();
      stopStream();
    },
  };
}
