import { Type, type Static } from "@sinclair/typebox";
import {
  ChannelIdSchema,
  MessageIdSchema,
  MessageSchema,
  type Message,
} from "../domain/index.js";
import type { UseCase } from "./use-case.js";

export const ListMessagesInputSchema = Type.Object(
  {
    channelId: ChannelIdSchema,
  },
  { additionalProperties: false },
);

export type ListMessagesInput = Static<typeof ListMessagesInputSchema>;

export const MessageListSchema = Type.Array(MessageSchema);

export type MessageList = Static<typeof MessageListSchema>;

/**
 * Latest 50 messages in the channel, oldest first, with `authorName`.
 * Signed out → `[]`.
 */
export const ListMessagesName = "list-messages" as const;

export type ListMessages = UseCase<
  ListMessagesInput,
  Message[],
  typeof ListMessagesName
>;

/**
 * Raw composer body. Trim then validate as a message body.
 */
export const SendMessageInputSchema = Type.Object(
  {
    channelId: ChannelIdSchema,
    body: Type.String(),
  },
  { additionalProperties: false },
);

export type SendMessageInput = Static<typeof SendMessageInputSchema>;

/**
 * Auth required. Publishes `message-list-changed`.
 */
export const SendMessageName = "send-message" as const;

export type SendMessage = UseCase<SendMessageInput, void, typeof SendMessageName>;

export const DeleteOwnMessageInputSchema = Type.Object(
  {
    messageId: MessageIdSchema,
  },
  { additionalProperties: false },
);

export type DeleteOwnMessageInput = Static<typeof DeleteOwnMessageInputSchema>;

/**
 * Auth required. Missing message is a no-op. Wrong author throws.
 * Publishes `message-list-changed` when a row is deleted.
 */
export const DeleteOwnMessageName = "delete-own-message" as const;

export type DeleteOwnMessage = UseCase<
  DeleteOwnMessageInput,
  void,
  typeof DeleteOwnMessageName
>;
