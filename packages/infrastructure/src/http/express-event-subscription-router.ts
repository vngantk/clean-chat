import express, { type Request, type Router } from "express";
import type { AppEvent, EventSubscriber } from "@clean-chat/core";
import { NOT_AUTHENTICATED_ERROR } from "@clean-chat/application";
import { sendHttpError } from "./http-error-handler.js";
import { TOO_MANY_CONNECTIONS_ERROR } from "./http-errors.js";

/** Default cap on concurrent SSE streams per bearer token (4 types × 2 tabs). */
export const DEFAULT_SSE_MAX_CONNECTIONS_PER_TOKEN = 8;

export type ExpressEventSubscriptionRouterOptions = {
  /** When false, the stream is not opened (401). */
  authorize?: (req: Request) => boolean | Promise<boolean>;
  /** Key for the connection cap (the bearer token). */
  connectionKey?: (req: Request) => string | null;
  /** Max open streams per {@link connectionKey}. Omitted → no cap. */
  maxConnectionsPerKey?: number;
};

/**
 * Express `Router` with `GET /{eventType}` for each event type. Each request
 * is an SSE stream: the handler subscribes via {@link EventSubscriber} and
 * writes `data: {json}` frames until the client disconnects.
 *
 * Mount it on an app (`app.use(router)` or `app.use("/events", router)`).
 * `GET` matches the browser `EventSource` API. This is not a public REST API.
 */
export function createExpressEventSubscriptionRouter(
  eventTypes: readonly AppEvent["type"][],
  subscriber: EventSubscriber,
  options?: ExpressEventSubscriptionRouterOptions,
): Router {
  const router = express.Router();
  const max = options?.maxConnectionsPerKey;
  const counts = new Map<string, number>();

  for (const eventType of eventTypes) {
    router.get(`/${eventType}`, async (req, res, next) => {
      try {
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

        const unsubscribe = subscriber.subscribe(eventType, (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        });
        req.on("close", unsubscribe);

        res.flushHeaders();
      } catch (err) {
        next(err);
      }
    });
  }

  return router;
}
