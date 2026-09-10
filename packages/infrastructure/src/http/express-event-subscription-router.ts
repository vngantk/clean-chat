import type { AppEvent, EventSubscriber } from "@clean-chat/core";
import express, { type Router } from "express";

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
): Router {
  const router = express.Router();

  for (const eventType of eventTypes) {
    router.get(`/${eventType}`, (req, res) => {
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
    });
  }

  return router;
}
