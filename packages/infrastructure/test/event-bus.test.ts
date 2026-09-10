import {
  channelListChanged,
  messageListChanged,
} from "@clean-chat/core";
import { describe, expect, it } from "vitest";
import { createInMemoryEventBus } from "../src/memory/event-bus.js";

describe("createInMemoryEventBus", () => {
  it("delivers a published event to subscribers of that type", async () => {
    const bus = createInMemoryEventBus();
    const received: unknown[] = [];
    bus.subscribe("channel-list-changed", (event) => {
      received.push(event);
    });

    await bus.publish(channelListChanged());

    expect(received).toEqual([{ type: "channel-list-changed" }]);
  });

  it("does not deliver events of other types", async () => {
    const bus = createInMemoryEventBus();
    const received: unknown[] = [];
    bus.subscribe("channel-list-changed", (event) => {
      received.push(event);
    });

    await bus.publish(messageListChanged("ch-1"));

    expect(received).toEqual([]);
  });

  it("stops delivery after unsubscribe", async () => {
    const bus = createInMemoryEventBus();
    const received: unknown[] = [];
    const unsubscribe = bus.subscribe("channel-list-changed", (event) => {
      received.push(event);
    });

    await bus.publish(channelListChanged());
    unsubscribe();
    unsubscribe();
    await bus.publish(channelListChanged());

    expect(received).toEqual([{ type: "channel-list-changed" }]);
  });

  it("notifies every subscriber of the same type", async () => {
    const bus = createInMemoryEventBus();
    const a: unknown[] = [];
    const b: unknown[] = [];
    bus.subscribe("message-list-changed", (event) => {
      a.push(event);
    });
    bus.subscribe("message-list-changed", (event) => {
      b.push(event);
    });

    const event = messageListChanged("ch-1");
    await bus.publish(event);

    expect(a).toEqual([event]);
    expect(b).toEqual([event]);
  });

  it("does not fail publish when a handler throws", async () => {
    const bus = createInMemoryEventBus();
    const received: unknown[] = [];
    bus.subscribe("channel-list-changed", () => {
      throw new Error("dead subscriber");
    });
    bus.subscribe("channel-list-changed", (event) => {
      received.push(event);
    });

    await expect(bus.publish(channelListChanged())).resolves.toBeUndefined();
    expect(received).toEqual([{ type: "channel-list-changed" }]);
  });

  it("does not replay events published before subscribe", async () => {
    const bus = createInMemoryEventBus();
    await bus.publish(channelListChanged());

    const received: unknown[] = [];
    bus.subscribe("channel-list-changed", (event) => {
      received.push(event);
    });

    expect(received).toEqual([]);
  });
});
