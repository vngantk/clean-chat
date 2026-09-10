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
  /** Key for the connection cap (the bearer token). */
  connectionKey?: (req: Request) => string | null;
  /** Max open streams per {@link connectionKey}. Omitted → no cap. */
  maxConnectionsPerKey?: number;
};

function writeSseFrame(res: Response, event: AppEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
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
): Router {
  const router = express.Router();
  const max = options?.maxConnectionsPerKey;
  const counts = new Map<string, number>();

  const tryOpen = async (
    req: Request,
    res: Response,
    types: readonly AppEvent["type"][],
  ): Promise<void> => {
    if (options?.authorize && !(await options.authorize(req))) {
      sendHttpError(res, 401, NOT_AUTHENTICATED_ERROR);
      return;
    }

    if (max !== undefined) {
      const key = options?.connectionKey?.(req) ?? null;
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
      req.on("close", () => {
        const current = counts.get(key) ?? 0;
        if (current <= 1) {
          counts.delete(key);
        } else {
          counts.set(key, current - 1);
        }
      });
    }

    req.socket.setTimeout(0);
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const unsubs: Unsubscribe[] = types.map((eventType) =>
      subscriber.subscribe(eventType, (event) => {
        writeSseFrame(res, event);
      }),
    );
    req.on("close", () => {
      for (const unsubscribe of unsubs) {
        unsubscribe();
      }
    });

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

  return router;
}
