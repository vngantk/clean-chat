import { UNKNOWN_AUTHOR_NAME } from "@clean-chat/domain";
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
});
