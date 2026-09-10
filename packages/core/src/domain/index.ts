/**
 * Domain — enterprise business rules.
 *
 * Entities are **plain types** inferred from TypeBox schemas (`XxxSchema` →
 * `type Xxx`). Import from `@clean-chat/core/domain`. This folder may depend
 * on TypeBox (`@sinclair/typebox`) and must not import `use-cases`, `events`,
 * other workspace packages, or I/O.
 */

export {
  ChannelSchema,
  ChannelIdSchema,
  ChannelNameSchema,
  CHANNEL_NAME_LENGTH_ERROR,
  CHANNEL_NAME_MAX_LENGTH,
  CHANNEL_NAME_PATTERN,
  CHANNEL_NAME_PATTERN_ERROR,
  GENERAL_CHANNEL_NAME,
  compareChannels,
  normalizeChannelName,
  type Channel,
  type ChannelId,
  type ChannelName,
} from "./channel/index.js";

export {
  MessageSchema,
  MessageBodySchema,
  MessageIdSchema,
  CHANNEL_NOT_FOUND_ERROR,
  MESSAGE_BODY_MAX_LENGTH,
  MESSAGE_DELETE_FORBIDDEN_ERROR,
  MESSAGE_EMPTY_ERROR,
  MESSAGE_LIST_LIMIT,
  MESSAGE_TOO_LONG_ERROR,
  UNKNOWN_AUTHOR_NAME,
  trimMessageBody,
  type Message,
  type MessageBody,
  type MessageId,
} from "./message/index.js";

export {
  PresenceSchema,
  SessionIdSchema,
  PRESENCE_FACEPILE_LIMIT,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_EXPIRE_MS,
  type Presence,
  type SessionId,
} from "./presence/index.js";

export {
  TypingSchema,
  TYPING_DEBOUNCE_MS,
  TYPING_EXPIRE_MS,
  type Typing,
} from "./typing/index.js";

export {
  UnixTimeMsSchema,
  type UnixTimeMs,
} from "./unix-time.js";

export {
  UserSchema,
  UserIdSchema,
  EmailSchema,
  PasswordSchema,
  DisplayNameSchema,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  trimDisplayName,
  type User,
  type UserId,
  type Email,
  type Password,
  type DisplayName,
} from "./user/index.js";
