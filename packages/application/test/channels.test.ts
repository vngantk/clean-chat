import { channelListChanged } from "@clean-chat/contracts";
import {
  CHANNEL_NAME_LENGTH_ERROR,
  CHANNEL_NAME_PATTERN_ERROR,
} from "@clean-chat/domain";
import { describe, expect, it } from "vitest";
import { createCreateChannel } from "../src/interactors/create-channel.js";
import { createEnsureGeneralChannel } from "../src/interactors/ensure-general-channel.js";
import { createListChannels } from "../src/interactors/list-channels.js";
import { NOT_AUTHENTICATED_ERROR } from "../src/interactors/require-user.js";
import {
  general,
  mockAuth,
  mockChannels,
  mockEvents,
  mockIds,
  mockUow,
  tx,
  user,
} from "./doubles.js";

describe("createListChannels", () => {
  it("returns [] when signed out without touching persistence", async () => {
    const auth = mockAuth(null);
    const uow = mockUow();
    const channels = mockChannels();
    await expect(
      createListChannels({ auth, uow, channels }).execute(),
    ).resolves.toEqual([]);
    expect(uow.run).not.toHaveBeenCalled();
  });

  it("puts general first, then alphabetical", async () => {
    const zeta = { id: "z", name: "zeta", createdBy: user.id };
    const alpha = { id: "a", name: "alpha", createdBy: user.id };
    const channels = mockChannels({
      list: async () => [zeta, general, alpha],
    });
    await expect(
      createListChannels({
        auth: mockAuth(),
        uow: mockUow(),
        channels,
      }).execute(),
    ).resolves.toEqual([general, alpha, zeta]);
  });
});

describe("createEnsureGeneralChannel", () => {
  it("returns the existing general channel and does not publish", async () => {
    const channels = mockChannels({
      getByName: async () => general,
    });
    const events = mockEvents();
    const ids = mockIds();
    await expect(
      createEnsureGeneralChannel({
        auth: mockAuth(),
        uow: mockUow(),
        channels,
        ids,
        events,
      }).execute(),
    ).resolves.toBe(general.id);
    expect(channels.insert).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
    expect(ids.next).not.toHaveBeenCalled();
  });

  it("inserts general and publishes after commit", async () => {
    const channels = mockChannels();
    const events = mockEvents();
    await expect(
      createEnsureGeneralChannel({
        auth: mockAuth(),
        uow: mockUow(),
        channels,
        ids: mockIds("ch-new"),
        events,
      }).execute(),
    ).resolves.toBe("ch-new");
    expect(channels.insert).toHaveBeenCalledWith(tx, {
      id: "ch-new",
      name: "general",
      createdBy: user.id,
    });
    expect(events.publish).toHaveBeenCalledWith(channelListChanged());
  });
});

describe("createCreateChannel", () => {
  it("normalizes, inserts, and publishes", async () => {
    const channels = mockChannels();
    const events = mockEvents();
    await expect(
      createCreateChannel({
        auth: mockAuth(),
        uow: mockUow(),
        channels,
        ids: mockIds("ch-team"),
        events,
      }).execute({ name: "  Team Chat " }),
    ).resolves.toBe("ch-team");
    expect(channels.insert).toHaveBeenCalledWith(tx, {
      id: "ch-team",
      name: "team-chat",
      createdBy: user.id,
    });
    expect(events.publish).toHaveBeenCalledWith(channelListChanged());
  });

  it("returns an existing slug without publishing", async () => {
    const existing = { id: "ch-team", name: "team-chat", createdBy: user.id };
    const channels = mockChannels({
      getByName: async () => existing,
    });
    const events = mockEvents();
    await expect(
      createCreateChannel({
        auth: mockAuth(),
        uow: mockUow(),
        channels,
        ids: mockIds(),
        events,
      }).execute({ name: "team-chat" }),
    ).resolves.toBe("ch-team");
    expect(channels.insert).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("rejects invalid characters", async () => {
    await expect(
      createCreateChannel({
        auth: mockAuth(),
        uow: mockUow(),
        channels: mockChannels(),
        ids: mockIds(),
        events: mockEvents(),
      }).execute({ name: "Hi!" }),
    ).rejects.toThrow(CHANNEL_NAME_PATTERN_ERROR);
  });

  it("rejects a slug longer than 32", async () => {
    await expect(
      createCreateChannel({
        auth: mockAuth(),
        uow: mockUow(),
        channels: mockChannels(),
        ids: mockIds(),
        events: mockEvents(),
      }).execute({ name: "a".repeat(33) }),
    ).rejects.toThrow(CHANNEL_NAME_LENGTH_ERROR);
  });

  it("requires a signed-in user", async () => {
    await expect(
      createCreateChannel({
        auth: mockAuth(null),
        uow: mockUow(),
        channels: mockChannels(),
        ids: mockIds(),
        events: mockEvents(),
      }).execute({ name: "ok" }),
    ).rejects.toThrow(NOT_AUTHENTICATED_ERROR);
  });
});
