import { type Server } from "node:http";
import type { AppEvent, EventSubscriber } from "@clean-chat/contracts";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { createExpressEventSubscriptionRouter } from "../src/http/index.js";

function createMockSubscriber() {
  const handlers = new Map<
    AppEvent["type"],
    Set<(event: AppEvent) => void>
  >();

  const subscriber: EventSubscriber = {
    subscribe(type, handler) {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      const wrapped = handler as (event: AppEvent) => void;
      set.add(wrapped);
      return () => {
        set.delete(wrapped);
      };
    },
  };

  return {
    subscriber,
    emit(event: AppEvent) {
      for (const handler of handlers.get(event.type) ?? []) {
        handler(event);
      }
    },
    count(type: AppEvent["type"]) {
      return handlers.get(type)?.size ?? 0;
    },
  };
}

async function listen(
  app: express.Express,
): Promise<{ origin: string; close: () => Promise<void> }> {
  const server: Server = await new Promise((resolve, reject) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    listening.once("error", reject);
  });
  const addr = server.address();
  if (addr === null || typeof addr === "string") {
    throw new Error("expected a TCP port");
  }
  return {
    origin: `http://127.0.0.1:${addr.port}`,
    close() {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
        server.closeAllConnections();
      });
    },
  };
}

async function readFirstSseData(res: Response): Promise<unknown> {
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("response has no body");
  }
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      throw new Error(`stream ended before SSE data: ${buf}`);
    }
    buf += decoder.decode(value, { stream: true });
    const match = /\ndata: (.*)\n\n/.exec(`\n${buf}`);
    if (match?.[1] !== undefined) {
      await reader.cancel();
      return JSON.parse(match[1]) as unknown;
    }
  }
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 1000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error("timed out");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("createExpressEventSubscriptionRouter", () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  async function mount(
    eventTypes: readonly AppEvent["type"][],
    subscriber: EventSubscriber,
    mountPath?: string,
  ) {
    const app = express();
    const router = createExpressEventSubscriptionRouter(eventTypes, subscriber);
    if (mountPath !== undefined) {
      app.use(mountPath, router);
    } else {
      app.use(router);
    }
    const listening = await listen(app);
    close = listening.close;
    return listening.origin;
  }

  it("opens SSE and forwards matching events as JSON data frames", async () => {
    const mock = createMockSubscriber();
    const origin = await mount(["channel-list-changed"], mock.subscriber);

    const res = await fetch(`${origin}/channel-list-changed`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);

    mock.emit({ type: "channel-list-changed" });
    await expect(readFirstSseData(res)).resolves.toEqual({
      type: "channel-list-changed",
    });
  });

  it("does not deliver other event types on that stream", async () => {
    const mock = createMockSubscriber();
    const origin = await mount(
      ["channel-list-changed", "message-list-changed"],
      mock.subscriber,
    );

    const res = await fetch(`${origin}/channel-list-changed`);
    mock.emit({ type: "message-list-changed", channelId: "ch-1" });
    mock.emit({ type: "channel-list-changed" });

    await expect(readFirstSseData(res)).resolves.toEqual({
      type: "channel-list-changed",
    });
  });

  it("unsubscribes when the client disconnects", async () => {
    const mock = createMockSubscriber();
    const origin = await mount(["typing-changed"], mock.subscriber);
    const ac = new AbortController();

    const res = await fetch(`${origin}/typing-changed`, { signal: ac.signal });
    expect(res.ok).toBe(true);
    expect(mock.count("typing-changed")).toBe(1);

    ac.abort();
    await waitFor(() => mock.count("typing-changed") === 0);
  });

  it("registers a route per event type", async () => {
    const mock = createMockSubscriber();
    const origin = await mount(
      ["channel-list-changed", "presence-changed"],
      mock.subscriber,
    );

    const channels = await fetch(`${origin}/channel-list-changed`);
    const presence = await fetch(`${origin}/presence-changed`);
    expect(channels.status).toBe(200);
    expect(presence.status).toBe(200);
    expect(mock.count("channel-list-changed")).toBe(1);
    expect(mock.count("presence-changed")).toBe(1);
  });

  it("responds 404 for an unknown path or POST", async () => {
    const mock = createMockSubscriber();
    const origin = await mount(["channel-list-changed"], mock.subscriber);

    const missing = await fetch(`${origin}/typing-changed`);
    const post = await fetch(`${origin}/channel-list-changed`, {
      method: "POST",
    });

    expect(missing.status).toBe(404);
    expect(post.status).toBe(404);
  });

  it("can be mounted at a path prefix", async () => {
    const mock = createMockSubscriber();
    const origin = await mount(
      ["channel-list-changed"],
      mock.subscriber,
      "/events",
    );

    const prefixed = await fetch(`${origin}/events/channel-list-changed`);
    const root = await fetch(`${origin}/channel-list-changed`);

    expect(prefixed.status).toBe(200);
    expect(root.status).toBe(404);
    await prefixed.body?.cancel();
  });
});
