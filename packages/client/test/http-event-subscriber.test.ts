import { createHttpEventSubscriber } from "@clean-chat/client";
import {
  channelListChanged,
  messageListChanged,
  type AppEvent,
  type EventSubscriber,
} from "@clean-chat/core";
import {
  createExpressEventSubscriptionRouter,
  createExpressServer,
  createInMemoryEventBus,
  type ExpressServer,
} from "@clean-chat/infrastructure";
import { afterEach, describe, expect, it } from "vitest";

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

function gate(inner: EventSubscriber): {
  subscriber: EventSubscriber;
  open: () => number;
} {
  let n = 0;
  return {
    open: () => n,
    subscriber: {
      subscribe(type, handler) {
        n += 1;
        const unsubscribe = inner.subscribe(type, handler);
        return () => {
          n -= 1;
          unsubscribe();
        };
      },
    },
  };
}

describe("createHttpEventSubscriber", () => {
  let server: ExpressServer | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  async function origin(
    types: readonly AppEvent["type"][],
    subscriber: EventSubscriber,
    mount = "/",
  ) {
    server = createExpressServer({
      routers: {
        [mount]: createExpressEventSubscriptionRouter(types, subscriber),
      },
      port: 0,
    });
    await server.start();
    const path = mount === "/" ? "" : mount;
    return `http://${server.host}:${String(server.port)}${path}`;
  }

  it("forwards published events over SSE", async () => {
    const bus = createInMemoryEventBus();
    const g = gate(bus);
    const base = await origin(["channel-list-changed"], g.subscriber);
    const client = createHttpEventSubscriber(base);
    const received: AppEvent[] = [];

    const unsubscribe = client.subscribe("channel-list-changed", (event) => {
      received.push(event);
    });
    await waitFor(() => g.open() === 1);
    await bus.publish(channelListChanged());
    await waitFor(() => received.length === 1);

    expect(received).toEqual([{ type: "channel-list-changed" }]);
    unsubscribe();
  });

  it("does not deliver other event types on that subscription", async () => {
    const bus = createInMemoryEventBus();
    const g = gate(bus);
    const base = await origin(
      ["channel-list-changed", "message-list-changed"],
      g.subscriber,
    );
    const client = createHttpEventSubscriber(base);
    const received: AppEvent[] = [];

    const unsubscribe = client.subscribe("channel-list-changed", (event) => {
      received.push(event);
    });
    await waitFor(() => g.open() === 2);
    await bus.publish(messageListChanged("ch-1"));
    await bus.publish(channelListChanged());
    await waitFor(() => received.length === 1);

    expect(received).toEqual([{ type: "channel-list-changed" }]);
    unsubscribe();
  });

  it("stops forwarding after unsubscribe", async () => {
    const bus = createInMemoryEventBus();
    const g = gate(bus);
    const base = await origin(["channel-list-changed"], g.subscriber);
    const client = createHttpEventSubscriber(base);
    const received: AppEvent[] = [];

    const unsubscribe = client.subscribe("channel-list-changed", (event) => {
      received.push(event);
    });
    await waitFor(() => g.open() === 1);
    unsubscribe();
    await waitFor(() => g.open() === 0);
    await bus.publish(channelListChanged());
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(received).toEqual([]);
  });

  it("subscribes under a mount prefix", async () => {
    const bus = createInMemoryEventBus();
    const g = gate(bus);
    const base = await origin(
      ["channel-list-changed"],
      g.subscriber,
      "/events",
    );
    const client = createHttpEventSubscriber(base);
    const received: AppEvent[] = [];

    const unsubscribe = client.subscribe("channel-list-changed", (event) => {
      received.push(event);
    });
    await waitFor(() => g.open() === 1);
    await bus.publish(channelListChanged());
    await waitFor(() => received.length === 1);

    expect(received).toEqual([{ type: "channel-list-changed" }]);
    unsubscribe();
  });

  it("reconnects after the SSE stream ends", async () => {
    const { default: express } = await import("express");
    const app = express();
    let connections = 0;
    app.get("/", (_req, res) => {
      connections += 1;
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream");
      res.write(
        `data: ${JSON.stringify({ type: "channel-list-changed" })}\n\n`,
      );
      res.end();
    });
    const listening = await new Promise<import("node:http").Server>(
      (resolve, reject) => {
        const s = app.listen(0, "127.0.0.1", () => resolve(s));
        s.once("error", reject);
      },
    );
    const addr = listening.address();
    if (addr === null || typeof addr === "string") {
      throw new Error("expected a TCP port");
    }
    const client = createHttpEventSubscriber(
      `http://127.0.0.1:${String(addr.port)}`,
      { reconnectDelayMs: 20 },
    );
    const received: AppEvent[] = [];
    const unsubscribe = client.subscribe("channel-list-changed", (event) => {
      received.push(event);
    });
    await waitFor(() => received.length >= 2);
    expect(connections).toBeGreaterThanOrEqual(2);
    unsubscribe();
    await new Promise<void>((resolve, reject) => {
      listening.closeAllConnections();
      listening.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("shares one SSE stream across subscribe() calls", async () => {
    const bus = createInMemoryEventBus();
    const g = gate(bus);
    const base = await origin(["channel-list-changed"], g.subscriber);
    const client = createHttpEventSubscriber(base);
    const received: AppEvent[] = [];

    const unsubscribeA = client.subscribe("channel-list-changed", (event) => {
      received.push(event);
    });
    const unsubscribeB = client.subscribe("channel-list-changed", (event) => {
      received.push(event);
    });
    await waitFor(() => g.open() === 1);
    await bus.publish(channelListChanged());
    await waitFor(() => received.length === 2);

    expect(received).toEqual([
      { type: "channel-list-changed" },
      { type: "channel-list-changed" },
    ]);
    unsubscribeA();
    unsubscribeB();
  });

  it("stops reconnecting after SSE 401 and notifies", async () => {
    const { default: express } = await import("express");
    const app = express();
    let connections = 0;
    app.get("/", (_req, res) => {
      connections += 1;
      res.status(401).json({ error: "Not authenticated" });
    });
    const listening = await new Promise<import("node:http").Server>(
      (resolve, reject) => {
        const s = app.listen(0, "127.0.0.1", () => resolve(s));
        s.once("error", reject);
      },
    );
    const addr = listening.address();
    if (addr === null || typeof addr === "string") {
      throw new Error("expected a TCP port");
    }
    let unauthorized = 0;
    const client = createHttpEventSubscriber(
      `http://127.0.0.1:${String(addr.port)}`,
      {
        reconnectDelayMs: 20,
        onUnauthorized: () => {
          unauthorized += 1;
        },
      },
    );
    const unsubscribe = client.subscribe("channel-list-changed", () => {
      // The 401 body is not an event.
    });
    await waitFor(() => unauthorized === 1);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(connections).toBe(1);
    unsubscribe();
    await new Promise<void>((resolve, reject) => {
      listening.closeAllConnections();
      listening.close((err) => (err ? reject(err) : resolve()));
    });
  });
});
