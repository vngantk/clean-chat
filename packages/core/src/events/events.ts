import { Type, type Static } from "@sinclair/typebox";
import { ChannelIdSchema, type ChannelId } from "../domain/index.js";

/**
 * Sidebar channel list is stale. Subscribers re-run `ListChannels`.
 */
export const ChannelListChangedSchema = Type.Object(
  {
    type: Type.Literal("channel-list-changed"),
  },
  { additionalProperties: false },
);

export type ChannelListChanged = Static<typeof ChannelListChangedSchema>;

/**
 * Message thread for one channel is stale. Subscribers re-run `ListMessages`.
 */
export const MessageListChangedSchema = Type.Object(
  {
    type: Type.Literal("message-list-changed"),
    channelId: ChannelIdSchema,
  },
  { additionalProperties: false },
);

export type MessageListChanged = Static<typeof MessageListChangedSchema>;

/**
 * Typing line for one channel is stale. Subscribers re-run `ListTyping`.
 */
export const TypingChangedSchema = Type.Object(
  {
    type: Type.Literal("typing-changed"),
    channelId: ChannelIdSchema,
  },
  { additionalProperties: false },
);

export type TypingChanged = Static<typeof TypingChangedSchema>;

/**
 * Facepile membership for one channel changed (not a heartbeat tick).
 * Subscribers re-run `ListPresence`.
 */
export const PresenceChangedSchema = Type.Object(
  {
    type: Type.Literal("presence-changed"),
    channelId: ChannelIdSchema,
  },
  { additionalProperties: false },
);

export type PresenceChanged = Static<typeof PresenceChangedSchema>;

/**
 * Closed catalog of application events. Write use cases publish these;
 * the UI adapter subscribes and re-runs the matching query use case.
 */
export const AppEventSchema = Type.Union([
  ChannelListChangedSchema,
  MessageListChangedSchema,
  TypingChangedSchema,
  PresenceChangedSchema,
]);

export type AppEvent = Static<typeof AppEventSchema>;

export function channelListChanged(): ChannelListChanged {
  return { type: "channel-list-changed" };
}

export function messageListChanged(channelId: ChannelId): MessageListChanged {
  return { type: "message-list-changed", channelId };
}

export function typingChanged(channelId: ChannelId): TypingChanged {
  return { type: "typing-changed", channelId };
}

export function presenceChanged(channelId: ChannelId): PresenceChanged {
  return { type: "presence-changed", channelId };
}
