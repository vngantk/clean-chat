import {
  channelListChanged,
  messageListChanged,
  type AppEvent,
  type EventSubscriber,
} from "@clean-chat/core";
import { afterEach, describe, expect, it } from "vitest";
import {
  createExpressEventSubscriptionRouter,
  createExpressServer,
  createHttpEventSubscriber,
  type ExpressServer,
} from "../src/http/index.js";
import { createInMemoryEventBus } from "../src/memory/event-bus.js";

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
    return `http://${server.getHost()}:${String(server.getPort())}${path}`;
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
    await waitFor(() => g.open() === 1);
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
});
