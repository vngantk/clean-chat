import { Type, type Static } from "@sinclair/typebox";
import { ChannelIdSchema } from "../channel/index.js";
import { DisplayNameSchema, UserIdSchema } from "../user/index.js";
import { UnixTimeMsSchema } from "../unix-time.js";

/** Client debounce before upserting a typing record. */
export const TYPING_DEBOUNCE_MS = 300;

/** Server expiry: drop typing if `updatedAt` is older than this. */
export const TYPING_EXPIRE_MS = 3000;

/**
 * Someone is typing in a channel. At most one record per (channelId, userId).
 *
 * `name` is joined at read time for the typing line.
 */
export const TypingSchema = Type.Object(
  {
    channelId: ChannelIdSchema,
    userId: UserIdSchema,
    name: DisplayNameSchema,
    updatedAt: UnixTimeMsSchema,
  },
  { additionalProperties: false },
);

export type Typing = Static<typeof TypingSchema>;
