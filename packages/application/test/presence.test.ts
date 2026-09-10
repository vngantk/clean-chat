import { presenceChanged } from "@clean-chat/core";
import { describe, expect, it } from "vitest";
import {
  createDisconnectPresence,
  PRESENCE_DISCONNECT_FORBIDDEN_ERROR,
} from "../src/interactors/disconnect-presence.js";
import { createHeartbeatPresence } from "../src/interactors/heartbeat-presence.js";
import { createListPresence } from "../src/interactors/list-presence.js";
import { NOT_AUTHENTICATED_ERROR } from "../src/interactors/require-user.js";
import {
  aPresence,
  mockAuth,
  mockEvents,
  mockPresence,
  mockUow,
  tx,
  user,
} from "./doubles.js";

describe("createListPresence", () => {
  it("returns [] when signed out", async () => {
    const uow = mockUow();
    await expect(
      createListPresence({
        auth: mockAuth(null),
        uow,
        presence: mockPresence(),
      }).execute({ channelId: "ch-1" }),
    ).resolves.toEqual([]);
    expect(uow.run).not.toHaveBeenCalled();
  });

  it("returns repository rows when signed in", async () => {
    const row = aPresence();
    const presence = mockPresence({
      listByChannel: async () => [row],
    });
    await expect(
      createListPresence({
        auth: mockAuth(),
        uow: mockUow(),
        presence,
      }).execute({ channelId: "ch-1" }),
    ).resolves.toEqual([row]);
  });
});

describe("createHeartbeatPresence", () => {
  it("publishes when a tab joins", async () => {
    const presence = mockPresence();
    const events = mockEvents();
    await createHeartbeatPresence({
      auth: mockAuth(),
      uow: mockUow(),
      presence,
      events,
    }).execute({ channelId: "ch-1", sessionId: "sess-1" });
    expect(presence.put).toHaveBeenCalledWith(tx, {
      channelId: "ch-1",
      userId: user.id,
      sessionId: "sess-1",
      online: true,
      name: user.name,
    });
    expect(events.publish).toHaveBeenCalledWith(presenceChanged("ch-1"));
  });

  it("does not publish on a heartbeat tick", async () => {
    const presence = mockPresence({
      get: async () => aPresence(),
    });
    const events = mockEvents();
    await createHeartbeatPresence({
      auth: mockAuth(),
      uow: mockUow(),
      presence,
      events,
    }).execute({ channelId: "ch-1", sessionId: "sess-1" });
    expect(presence.put).toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("publishes when the session changes user", async () => {
    const presence = mockPresence({
      get: async () => aPresence({ userId: "other" }),
    });
    const events = mockEvents();
    await createHeartbeatPresence({
      auth: mockAuth(),
      uow: mockUow(),
      presence,
      events,
    }).execute({ channelId: "ch-1", sessionId: "sess-1" });
    expect(events.publish).toHaveBeenCalledWith(presenceChanged("ch-1"));
  });
});

describe("createDisconnectPresence", () => {
  it("publishes when an online row of the caller is removed", async () => {
    const presence = mockPresence({
      get: async () => aPresence(),
    });
    const events = mockEvents();
    await createDisconnectPresence({
      auth: mockAuth(),
      uow: mockUow(),
      presence,
      events,
    }).execute({ channelId: "ch-1", sessionId: "sess-1" });
    expect(presence.remove).toHaveBeenCalledWith(tx, "ch-1", "sess-1");
    expect(events.publish).toHaveBeenCalledWith(presenceChanged("ch-1"));
  });

  it("does not publish when there is no row", async () => {
    const presence = mockPresence();
    const events = mockEvents();
    await createDisconnectPresence({
      auth: mockAuth(),
      uow: mockUow(),
      presence,
      events,
    }).execute({ channelId: "ch-1", sessionId: "sess-1" });
    expect(presence.remove).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("throws when signed out", async () => {
    await expect(
      createDisconnectPresence({
        auth: mockAuth(null),
        uow: mockUow(),
        presence: mockPresence(),
        events: mockEvents(),
      }).execute({ channelId: "ch-1", sessionId: "sess-1" }),
    ).rejects.toThrow(NOT_AUTHENTICATED_ERROR);
  });

  it("throws when the row belongs to another user", async () => {
    const presence = mockPresence({
      get: async () => aPresence({ userId: "other" }),
    });
    await expect(
      createDisconnectPresence({
        auth: mockAuth(),
        uow: mockUow(),
        presence,
        events: mockEvents(),
      }).execute({ channelId: "ch-1", sessionId: "sess-1" }),
    ).rejects.toThrow(PRESENCE_DISCONNECT_FORBIDDEN_ERROR);
    expect(presence.remove).not.toHaveBeenCalled();
  });
});
