import { typingChanged } from "@clean-chat/core";
import { TYPING_EXPIRE_MS } from "@clean-chat/core/domain";
import { describe, expect, it } from "vitest";
import { createClearTyping } from "../src/interactors/clear-typing.js";
import { createListTyping } from "../src/interactors/list-typing.js";
import { createUpsertTyping } from "../src/interactors/upsert-typing.js";
import {
  aTyping,
  mockAuth,
  mockClock,
  mockEvents,
  mockTyping,
  mockUow,
  tx,
  user,
} from "./doubles.js";

const now = 10_000;

describe("createListTyping", () => {
  it("returns [] when signed out", async () => {
    const uow = mockUow();
    await expect(
      createListTyping({
        auth: mockAuth(null),
        uow,
        typing: mockTyping(),
        clock: mockClock(now),
      }).execute({ channelId: "ch-1" }),
    ).resolves.toEqual([]);
    expect(uow.run).not.toHaveBeenCalled();
  });

  it("drops rows at or past the expiry window", async () => {
    const fresh = aTyping({
      userId: "u-fresh",
      updatedAt: now - TYPING_EXPIRE_MS + 1,
    });
    const stale = aTyping({
      userId: "u-stale",
      updatedAt: now - TYPING_EXPIRE_MS,
    });
    const typing = mockTyping({
      listByChannel: async () => [fresh, stale],
    });
    await expect(
      createListTyping({
        auth: mockAuth(),
        uow: mockUow(),
        typing,
        clock: mockClock(now),
      }).execute({ channelId: "ch-1" }),
    ).resolves.toEqual([fresh]);
  });
});

describe("createUpsertTyping", () => {
  it("puts the actor's row and publishes after commit", async () => {
    const typing = mockTyping();
    const events = mockEvents();
    await createUpsertTyping({
      auth: mockAuth(),
      uow: mockUow(),
      typing,
      clock: mockClock(now),
      events,
    }).execute({ channelId: "ch-1" });
    expect(typing.put).toHaveBeenCalledWith(tx, {
      channelId: "ch-1",
      userId: user.id,
      name: user.name,
      updatedAt: now,
    });
    expect(events.publish).toHaveBeenCalledWith(typingChanged("ch-1"));
  });
});

describe("createClearTyping", () => {
  it("removes the actor's row and publishes", async () => {
    const typing = mockTyping({
      listByChannel: async () => [aTyping()],
    });
    const events = mockEvents();
    await createClearTyping({
      auth: mockAuth(),
      uow: mockUow(),
      typing,
      events,
    }).execute({ channelId: "ch-1" });
    expect(typing.remove).toHaveBeenCalledWith(tx, "ch-1", user.id);
    expect(events.publish).toHaveBeenCalledWith(typingChanged("ch-1"));
  });

  it("does not publish when there is no row to clear", async () => {
    const typing = mockTyping();
    const events = mockEvents();
    await createClearTyping({
      auth: mockAuth(),
      uow: mockUow(),
      typing,
      events,
    }).execute({ channelId: "ch-1" });
    expect(typing.remove).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });
});
