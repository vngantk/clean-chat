import { Type, type Static } from "@sinclair/typebox";
import { ChannelIdSchema } from "../channel/index.js";
import { DisplayNameSchema, UserIdSchema } from "../user/index.js";

/**
 * Distinguishes two tabs of the same user in the same channel.
 */
export const SessionIdSchema = Type.String({
  minLength: 1,
  description: "Browser tab / session id for presence",
});

export type SessionId = Static<typeof SessionIdSchema>;

/** Avatars shown in the facepile before `+N` overflow. */
export const PRESENCE_FACEPILE_LIMIT = 5;

/**
 * Who is in a channel. Heartbeats must not change list identity on every tick;
 * `online` is the field the UI cares about.
 */
export const PresenceSchema = Type.Object(
  {
    channelId: ChannelIdSchema,
    userId: UserIdSchema,
    sessionId: SessionIdSchema,
    online: Type.Boolean(),
    name: DisplayNameSchema,
  },
  { additionalProperties: false },
);

export type Presence = Static<typeof PresenceSchema>;
