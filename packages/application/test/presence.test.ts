import { presenceChanged } from "@clean-chat/core";
import { PRESENCE_EXPIRE_MS } from "@clean-chat/core/domain";
import { describe, expect, it, vi } from "vitest";
import {
  createDisconnectPresence,
  PRESENCE_DISCONNECT_FORBIDDEN_ERROR,
} from "../src/interactors/disconnect-presence.js";
import { createExpireStalePresence } from "../src/interactors/expire-stale-presence.js";
import { createHeartbeatPresence } from "../src/interactors/heartbeat-presence.js";
import { createListPresence } from "../src/interactors/list-presence.js";
import { NOT_AUTHENTICATED_ERROR } from "../src/interactors/require-user.js";
import {
  aPresence,
  mockAuth,
  mockClock,
  mockEvents,
  mockPresence,
  mockUow,
  tx,
  user,
} from "./doubles.js";

const now = 1_000_000;

function listPresenceDeps(
  overrides: {
    auth?: ReturnType<typeof mockAuth>;
    presence?: ReturnType<typeof mockPresence>;
  } = {},
) {
  return {
    auth: overrides.auth ?? mockAuth(),
    uow: mockUow(),
    presence: overrides.presence ?? mockPresence(),
    clock: mockClock(now),
    events: mockEvents(),
  };
}

function heartbeatDeps(
  overrides: {
    presence?: ReturnType<typeof mockPresence>;
  } = {},
) {
  return {
    auth: mockAuth(),
    uow: mockUow(),
    presence: overrides.presence ?? mockPresence(),
    clock: mockClock(now),
    events: mockEvents(),
  };
}

describe("createListPresence", () => {
  it("throws when signed out", async () => {
    const uow = mockUow();
    await expect(
      createListPresence({
        ...listPresenceDeps({ auth: mockAuth(null) }),
        uow,
      }).execute({ channelId: "ch-1" }),
    ).rejects.toThrow(NOT_AUTHENTICATED_ERROR);
    expect(uow.run).not.toHaveBeenCalled();
  });

  it("returns repository rows when signed in", async () => {
    const row = aPresence();
    const presence = mockPresence({
      listByChannel: async () => [row],
    });
    await expect(
      createListPresence(listPresenceDeps({ presence })).execute({
        channelId: "ch-1",
      }),
    ).resolves.toEqual([row]);
  });

  it("deletes expired rows and publishes", async () => {
    const fresh = aPresence({ sessionId: "fresh", lastSeenAt: now - 1 });
    const stale = aPresence({
      sessionId: "stale",
      lastSeenAt: now - PRESENCE_EXPIRE_MS,
    });
    const presence = mockPresence({
      listByChannel: async () => [fresh, stale],
    });
    const deps = listPresenceDeps({ presence });
    await expect(
      createListPresence(deps).execute({ channelId: "ch-1" }),
    ).resolves.toEqual([fresh]);
    expect(presence.remove).toHaveBeenCalledWith(tx, "ch-1", "stale");
    expect(deps.events.publish).toHaveBeenCalledWith(presenceChanged("ch-1"));
  });
});

describe("createHeartbeatPresence", () => {
  it("publishes when a tab joins", async () => {
    const deps = heartbeatDeps();
    await createHeartbeatPresence(deps).execute({
      channelId: "ch-1",
      sessionId: "sess-1",
    });
    expect(deps.presence.put).toHaveBeenCalledWith(tx, {
      channelId: "ch-1",
      userId: user.id,
      sessionId: "sess-1",
      online: true,
      name: user.name,
      lastSeenAt: now,
    });
    expect(deps.events.publish).toHaveBeenCalledWith(presenceChanged("ch-1"));
  });

  it("does not publish on a heartbeat tick", async () => {
    const presence = mockPresence({
      get: async () => aPresence(),
    });
    const deps = heartbeatDeps({ presence });
    await createHeartbeatPresence(deps).execute({
      channelId: "ch-1",
      sessionId: "sess-1",
    });
    expect(presence.put).toHaveBeenCalled();
    expect(deps.events.publish).not.toHaveBeenCalled();
  });

  it("publishes when the session changes user", async () => {
    const presence = mockPresence({
      get: async () => aPresence({ userId: "other" }),
    });
    const deps = heartbeatDeps({ presence });
    await createHeartbeatPresence(deps).execute({
      channelId: "ch-1",
      sessionId: "sess-1",
    });
    expect(deps.events.publish).toHaveBeenCalledWith(presenceChanged("ch-1"));
  });

  it("clears this tab from other channels and publishes those rooms", async () => {
    const presence = mockPresence({
      removeSessionFromOtherChannels: vi.fn(async () => ["ch-2"]),
    });
    const deps = heartbeatDeps({ presence });
    await createHeartbeatPresence(deps).execute({
      channelId: "ch-1",
      sessionId: "sess-1",
    });
    expect(presence.removeSessionFromOtherChannels).toHaveBeenCalledWith(
      tx,
      "sess-1",
      "ch-1",
    );
    expect(deps.events.publish).toHaveBeenCalledWith(presenceChanged("ch-1"));
    expect(deps.events.publish).toHaveBeenCalledWith(presenceChanged("ch-2"));
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

describe("createExpireStalePresence", () => {
  it("removes expired rows and publishes affected channels", async () => {
    const presence = mockPresence({
      removeExpired: vi.fn(async () => ["ch-1", "ch-2"]),
    });
    const events = mockEvents();
    await createExpireStalePresence({
      uow: mockUow(),
      presence,
      clock: mockClock(now),
      events,
    })();
    expect(presence.removeExpired).toHaveBeenCalledWith(
      tx,
      now,
      PRESENCE_EXPIRE_MS,
    );
    expect(events.publish).toHaveBeenCalledWith(presenceChanged("ch-1"));
    expect(events.publish).toHaveBeenCalledWith(presenceChanged("ch-2"));
  });
});
