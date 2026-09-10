import express, { type Request, type Response, type Router } from "express";
import type { AppEvent, EventSubscriber, Unsubscribe } from "@clean-chat/core";
import { NOT_AUTHENTICATED_ERROR } from "@clean-chat/application";
import { sendHttpError } from "./http-error-handler.js";
import { TOO_MANY_CONNECTIONS_ERROR } from "./http-errors.js";

/**
 * Default cap on concurrent SSE streams per bearer token.
 * The SPA uses one multiplexed `GET /events` stream per tab.
 */
export const DEFAULT_SSE_MAX_CONNECTIONS_PER_TOKEN = 16;

export type ExpressEventSubscriptionRouterOptions = {
  /** When false, the stream is not opened (401). */
  authorize?: (req: Request) => boolean | Promise<boolean>;
  /** Key for the connection cap and session checks (the bearer token). */
  connectionKey?: (req: Request) => string | null;
  /** Max open streams per {@link connectionKey}. Omitted → no cap. */
  maxConnectionsPerKey?: number;
  /**
   * Re-checked on each publish. When false, the stream is ended (sign-out
   * or session TTL). {@link connectionKey} must be set.
   */
  isSessionActive?: (key: string) => boolean;
};

export type ExpressEventSubscriptionRouter = Router & {
  /** End every open SSE stream for this connection key (revoked token). */
  closeConnectionsForKey(key: string): void;
};

function writeSseFrame(res: Response, event: AppEvent): boolean {
  if (res.writableEnded || res.destroyed) {
    return false;
  }
  try {
    return res.write(`data: ${JSON.stringify(event)}\n\n`);
  } catch {
    return false;
  }
}

/**
 * Express `Router` with `GET /` (all event types on one SSE stream) and
 * `GET /{eventType}` for a single type. The SPA uses the multiplexed `/`
 * so one tab does not exhaust the browser’s HTTP/1.1 connection limit
 * (six per origin). Per-type routes remain for tests and debugging.
 *
 * Mount it on an app (`app.use(router)` or `app.use("/events", router)`).
 * This is not a public REST API.
 */
export function createExpressEventSubscriptionRouter(
  eventTypes: readonly AppEvent["type"][],
  subscriber: EventSubscriber,
  options?: ExpressEventSubscriptionRouterOptions,
): ExpressEventSubscriptionRouter {
  const router = express.Router();
  const max = options?.maxConnectionsPerKey;
  const counts = new Map<string, number>();
  const connections = new Map<string, Set<() => void>>();

  function closeConnectionsForKey(key: string): void {
    const set = connections.get(key);
    if (set === undefined) {
      return;
    }
    for (const close of [...set]) {
      close();
    }
  }

  const tryOpen = async (
    req: Request,
    res: Response,
    types: readonly AppEvent["type"][],
  ): Promise<void> => {
    if (options?.authorize && !(await options.authorize(req))) {
      sendHttpError(res, 401, NOT_AUTHENTICATED_ERROR);
      return;
    }

    const key = options?.connectionKey?.(req) ?? null;
    if (max !== undefined) {
      if (key === null) {
        sendHttpError(res, 401, NOT_AUTHENTICATED_ERROR);
        return;
      }
      const n = counts.get(key) ?? 0;
      if (n >= max) {
        sendHttpError(res, 429, TOO_MANY_CONNECTIONS_ERROR);
        return;
      }
      counts.set(key, n + 1);
    }

    req.socket.setTimeout(0);
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let closed = false;
    const unsubs: Unsubscribe[] = [];

    const closeStream = (): void => {
      if (closed) {
        return;
      }
      closed = true;
      for (const unsubscribe of unsubs) {
        unsubscribe();
      }
      unsubs.length = 0;
      if (key !== null) {
        const set = connections.get(key);
        if (set !== undefined) {
          set.delete(closeStream);
          if (set.size === 0) {
            connections.delete(key);
          }
        }
        if (max !== undefined) {
          const current = counts.get(key) ?? 0;
          if (current <= 1) {
            counts.delete(key);
          } else {
            counts.set(key, current - 1);
          }
        }
      }
      if (!res.writableEnded && !res.destroyed) {
        res.end();
      }
    };

    if (key !== null) {
      let set = connections.get(key);
      if (set === undefined) {
        set = new Set();
        connections.set(key, set);
      }
      set.add(closeStream);
    }

    for (const eventType of types) {
      unsubs.push(
        subscriber.subscribe(eventType, (event) => {
          if (closed) {
            return;
          }
          if (
            key !== null &&
            options?.isSessionActive !== undefined &&
            !options.isSessionActive(key)
          ) {
            closeStream();
            return;
          }
          if (!writeSseFrame(res, event)) {
            closeStream();
          }
        }),
      );
    }

    req.on("close", closeStream);
    res.on("close", closeStream);
    res.on("error", closeStream);

    res.flushHeaders();
  };

  router.get("/", async (req, res, next) => {
    try {
      await tryOpen(req, res, eventTypes);
    } catch (err) {
      next(err);
    }
  });

  for (const eventType of eventTypes) {
    router.get(`/${eventType}`, async (req, res, next) => {
      try {
        await tryOpen(req, res, [eventType]);
      } catch (err) {
        next(err);
      }
    });
  }

  return Object.assign(router, { closeConnectionsForKey });
}
