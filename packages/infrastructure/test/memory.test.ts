import { UNKNOWN_AUTHOR_NAME } from "@clean-chat/core/domain";
import { describe, expect, it } from "vitest";
import { createInMemoryPersistence } from "../src/memory/index.js";

const user = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada",
};

const general = {
  id: "ch-g",
  name: "general",
  createdBy: user.id,
};

describe("in-memory persistence", () => {
  it("stores channels and looks them up by name", async () => {
    const { uow, channels } = createInMemoryPersistence();
    await uow.run(async (tx) => {
      await channels.insert(tx, general);
    });
    await uow.run(async (tx) => {
      await expect(channels.getByName(tx, "general")).resolves.toEqual(general);
      await expect(channels.list(tx)).resolves.toEqual([general]);
    });
  });

  it("joins authorName on message read, Unknown if the user is gone", async () => {
    const { store, uow, messages } = createInMemoryPersistence();
    store.users.set(user.id, user);
    await uow.run(async (tx) => {
      await messages.insert(tx, {
        id: "m1",
        channelId: "ch-1",
        authorId: user.id,
        body: "hello",
        createdAt: 10,
      });
      await messages.insert(tx, {
        id: "m2",
        channelId: "ch-1",
        authorId: "gone",
        body: "bye",
        createdAt: 20,
      });
    });
    const listed = await uow.run((tx) =>
      messages.listLatestByChannel(tx, "ch-1", 50),
    );
    expect(listed.map((m) => m.authorName)).toEqual([
      user.name,
      UNKNOWN_AUTHOR_NAME,
    ]);
    expect(listed.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("returns the latest N messages oldest-first", async () => {
    const { uow, messages } = createInMemoryPersistence();
    await uow.run(async (tx) => {
      await messages.insert(tx, {
        id: "m1",
        channelId: "ch-1",
        authorId: user.id,
        body: "a",
        createdAt: 1,
      });
      await messages.insert(tx, {
        id: "m2",
        channelId: "ch-1",
        authorId: user.id,
        body: "b",
        createdAt: 2,
      });
      await messages.insert(tx, {
        id: "m3",
        channelId: "ch-1",
        authorId: user.id,
        body: "c",
        createdAt: 3,
      });
    });
    const listed = await uow.run((tx) =>
      messages.listLatestByChannel(tx, "ch-1", 2),
    );
    expect(listed.map((m) => m.id)).toEqual(["m2", "m3"]);
  });

  it("upserts typing by (channelId, userId)", async () => {
    const { uow, typing } = createInMemoryPersistence();
    await uow.run(async (tx) => {
      await typing.put(tx, {
        channelId: "ch-1",
        userId: user.id,
        name: "Ada",
        updatedAt: 1,
      });
      await typing.put(tx, {
        channelId: "ch-1",
        userId: user.id,
        name: "Ada",
        updatedAt: 2,
      });
    });
    const rows = await uow.run((tx) => typing.listByChannel(tx, "ch-1"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.updatedAt).toBe(2);
  });

  it("keys presence by (channelId, sessionId)", async () => {
    const { uow, presence } = createInMemoryPersistence();
    const row = {
      channelId: "ch-1",
      userId: user.id,
      sessionId: "sess-1",
      online: true,
      name: user.name,
      lastSeenAt: 1,
    };
    await uow.run(async (tx) => {
      await presence.put(tx, row);
    });
    await uow.run(async (tx) => {
      await expect(presence.get(tx, "ch-1", "sess-1")).resolves.toEqual(row);
      await presence.remove(tx, "ch-1", "sess-1");
      await expect(presence.get(tx, "ch-1", "sess-1")).resolves.toBeNull();
    });
  });

  it("drops a session from every channel except the one it heartbeats", async () => {
    const { uow, presence } = createInMemoryPersistence();
    const sess = "sess-1";
    await uow.run(async (tx) => {
      await presence.put(tx, {
        channelId: "ch-1",
        userId: user.id,
        sessionId: sess,
        online: true,
        name: user.name,
        lastSeenAt: 1,
      });
      await presence.put(tx, {
        channelId: "ch-2",
        userId: user.id,
        sessionId: sess,
        online: true,
        name: user.name,
        lastSeenAt: 1,
      });
    });
    const left = await uow.run((tx) =>
      presence.removeSessionFromOtherChannels(tx, sess, "ch-2"),
    );
    expect(left).toEqual(["ch-1"]);
    await uow.run(async (tx) => {
      await expect(presence.get(tx, "ch-1", sess)).resolves.toBeNull();
      await expect(presence.get(tx, "ch-2", sess)).resolves.toMatchObject({
        channelId: "ch-2",
      });
    });
  });

  it("rolls the store back when UnitOfWork.run throws", async () => {
    const { uow, channels } = createInMemoryPersistence();
    await expect(
      uow.run(async (tx) => {
        await channels.insert(tx, general);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    await uow.run(async (tx) => {
      await expect(channels.list(tx)).resolves.toEqual([]);
    });
  });

  it("does not rewind a committed run when a later concurrent run throws", async () => {
    const { store, uow, messages } = createInMemoryPersistence();
    store.users.set(user.id, user);

    const first = uow.run(async (tx) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      await messages.insert(tx, {
        id: "m1",
        channelId: "ch-1",
        authorId: user.id,
        body: "kept",
        createdAt: 1,
      });
    });
    const second = uow.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      throw new Error("fail");
    });

    await first;
    await expect(second).rejects.toThrow("fail");

    const listed = await uow.run((tx) =>
      messages.listLatestByChannel(tx, "ch-1", 50),
    );
    expect(listed.map((m) => m.id)).toEqual(["m1"]);
  });

  it("deletes presence rows past the lastSeenAt TTL", async () => {
    const { uow, presence } = createInMemoryPersistence();
    await uow.run(async (tx) => {
      await presence.put(tx, {
        channelId: "ch-1",
        userId: user.id,
        sessionId: "fresh",
        online: true,
        name: user.name,
        lastSeenAt: 100,
      });
      await presence.put(tx, {
        channelId: "ch-1",
        userId: user.id,
        sessionId: "stale",
        online: true,
        name: user.name,
        lastSeenAt: 50,
      });
    });
    const left = await uow.run((tx) => presence.removeExpired(tx, 80, 20));
    expect(left).toEqual(["ch-1"]);
    await uow.run(async (tx) => {
      await expect(presence.get(tx, "ch-1", "fresh")).resolves.toMatchObject({
        sessionId: "fresh",
      });
      await expect(presence.get(tx, "ch-1", "stale")).resolves.toBeNull();
    });
  });
});
