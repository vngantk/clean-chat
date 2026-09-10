import { messageListChanged } from "@clean-chat/core";
import {
  CHANNEL_NOT_FOUND_ERROR,
  MESSAGE_BODY_MAX_LENGTH,
  MESSAGE_DELETE_FORBIDDEN_ERROR,
  MESSAGE_EMPTY_ERROR,
  MESSAGE_LIST_LIMIT,
  MESSAGE_TOO_LONG_ERROR,
} from "@clean-chat/core/domain";
import { describe, expect, it } from "vitest";
import { createDeleteOwnMessage } from "../src/interactors/delete-own-message.js";
import { createListMessages } from "../src/interactors/list-messages.js";
import { NOT_AUTHENTICATED_ERROR } from "../src/interactors/require-user.js";
import { createSendMessage } from "../src/interactors/send-message.js";
import {
  aMessage,
  general,
  mockAuth,
  mockChannels,
  mockClock,
  mockEvents,
  mockIds,
  mockMessages,
  mockUow,
  tx,
  user,
} from "./doubles.js";

describe("createListMessages", () => {
  it("throws when signed out", async () => {
    const messages = mockMessages();
    const uow = mockUow();
    await expect(
      createListMessages({
        auth: mockAuth(null),
        uow,
        messages,
      }).execute({ channelId: "ch-1" }),
    ).rejects.toThrow(NOT_AUTHENTICATED_ERROR);
    expect(uow.run).not.toHaveBeenCalled();
  });

  it("asks the repository for the product list window", async () => {
    const messages = mockMessages();
    await createListMessages({
      auth: mockAuth(),
      uow: mockUow(),
      messages,
    }).execute({ channelId: "ch-1" });
    expect(messages.listLatestByChannel).toHaveBeenCalledWith(
      tx,
      "ch-1",
      MESSAGE_LIST_LIMIT,
    );
  });
});

describe("createSendMessage", () => {
  const deps = () => {
    const channels = mockChannels({
      getById: async () => general,
    });
    const messages = mockMessages();
    const events = mockEvents();
    return {
      auth: mockAuth(),
      uow: mockUow(),
      channels,
      messages,
      clock: mockClock(42),
      ids: mockIds("msg-new"),
      events,
    };
  };

  it("inserts then publishes after commit", async () => {
    const d = deps();
    await createSendMessage(d).execute({
      channelId: general.id,
      body: "  hello  ",
    });
    expect(d.messages.insert).toHaveBeenCalledWith(tx, {
      id: "msg-new",
      channelId: general.id,
      authorId: user.id,
      body: "hello",
      createdAt: 42,
    });
    expect(d.events.publish).toHaveBeenCalledWith(
      messageListChanged(general.id),
    );
  });

  it("does not publish when the channel is missing", async () => {
    const d = deps();
    d.channels.getById = async () => null;
    await expect(
      createSendMessage(d).execute({ channelId: "missing", body: "hi" }),
    ).rejects.toThrow(CHANNEL_NOT_FOUND_ERROR);
    expect(d.events.publish).not.toHaveBeenCalled();
  });

  it("rejects an empty body before opening a unit of work", async () => {
    const d = deps();
    await expect(
      createSendMessage(d).execute({ channelId: general.id, body: "   " }),
    ).rejects.toThrow(MESSAGE_EMPTY_ERROR);
    expect(d.uow.run).not.toHaveBeenCalled();
  });

  it("rejects a body over the max length", async () => {
    const d = deps();
    await expect(
      createSendMessage(d).execute({
        channelId: general.id,
        body: "x".repeat(MESSAGE_BODY_MAX_LENGTH + 1),
      }),
    ).rejects.toThrow(MESSAGE_TOO_LONG_ERROR);
  });

  it("requires a signed-in user", async () => {
    const d = { ...deps(), auth: mockAuth(null) };
    await expect(
      createSendMessage(d).execute({ channelId: general.id, body: "hi" }),
    ).rejects.toThrow(NOT_AUTHENTICATED_ERROR);
  });
});

describe("createDeleteOwnMessage", () => {
  it("deletes the caller's message and publishes", async () => {
    const message = aMessage();
    const messages = mockMessages({
      getById: async () => message,
    });
    const events = mockEvents();
    await createDeleteOwnMessage({
      auth: mockAuth(),
      uow: mockUow(),
      messages,
      events,
    }).execute({ messageId: message.id });
    expect(messages.remove).toHaveBeenCalledWith(tx, message.id);
    expect(events.publish).toHaveBeenCalledWith(
      messageListChanged(message.channelId),
    );
  });

  it("is a no-op when the message is gone", async () => {
    const messages = mockMessages();
    const events = mockEvents();
    await createDeleteOwnMessage({
      auth: mockAuth(),
      uow: mockUow(),
      messages,
      events,
    }).execute({ messageId: "gone" });
    expect(messages.remove).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("refuses to delete someone else's message", async () => {
    const messages = mockMessages({
      getById: async () => aMessage({ authorId: "other" }),
    });
    const events = mockEvents();
    await expect(
      createDeleteOwnMessage({
        auth: mockAuth(),
        uow: mockUow(),
        messages,
        events,
      }).execute({ messageId: "msg-1" }),
    ).rejects.toThrow(MESSAGE_DELETE_FORBIDDEN_ERROR);
    expect(events.publish).not.toHaveBeenCalled();
  });
});
