import { Type, type Static } from "@sinclair/typebox";
import { ChannelIdSchema } from "../channel/index.js";
import { DisplayNameSchema, UserIdSchema } from "../user/index.js";
import { UnixTimeMsSchema } from "../unix-time.js";

/**
 * Stable unique identifier for a message.
 */
export const MessageIdSchema = Type.String({
  minLength: 1,
  description: "Stable unique message id",
});

export type MessageId = Static<typeof MessageIdSchema>;

/** Maximum length of a message body after trim. */
export const MESSAGE_BODY_MAX_LENGTH = 2000;

/** Latest messages returned for a channel list. */
export const MESSAGE_LIST_LIMIT = 50;

/** Product error when the body is empty after trim. */
export const MESSAGE_EMPTY_ERROR = "Message cannot be empty.";

/** Product error when the body is longer than {@link MESSAGE_BODY_MAX_LENGTH}. */
export const MESSAGE_TOO_LONG_ERROR = "Message is too long.";

/** Product error when send targets a channel that does not exist. */
export const CHANNEL_NOT_FOUND_ERROR = "Channel not found.";

/** Product error when a user tries to delete someone else's message. */
export const MESSAGE_DELETE_FORBIDDEN_ERROR =
  "You can only delete your own messages.";

/** Display name when the author document is gone. */
export const UNKNOWN_AUTHOR_NAME = "Unknown";

/**
 * Trimmed message text. Non-empty, at most {@link MESSAGE_BODY_MAX_LENGTH}.
 */
export const MessageBodySchema = Type.String({
  minLength: 1,
  maxLength: MESSAGE_BODY_MAX_LENGTH,
  description: "Trimmed message body",
});

export type MessageBody = Static<typeof MessageBodySchema>;

/**
 * Chat message in a channel.
 *
 * `authorName` is joined or denormalized at read time.
 */
export const MessageSchema = Type.Object(
  {
    id: MessageIdSchema,
    channelId: ChannelIdSchema,
    authorId: UserIdSchema,
    body: MessageBodySchema,
    authorName: DisplayNameSchema,
    createdAt: UnixTimeMsSchema,
  },
  { additionalProperties: false },
);

export type Message = Static<typeof MessageSchema>;

/**
 * Trim message body. Empty after trim is invalid ({@link MessageBodySchema}).
 */
export function trimMessageBody(body: string): string {
  return body.trim();
}
