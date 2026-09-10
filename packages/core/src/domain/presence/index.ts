import { Type, type Static } from "@sinclair/typebox";
import { ChannelIdSchema } from "../channel/index.js";
import { DisplayNameSchema, UserIdSchema } from "../user/index.js";
import { UnixTimeMsSchema } from "../unix-time.js";

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
 * Client heartbeat interval. Server expiry is {@link PRESENCE_EXPIRE_MS}
 * (~3 missed beats) so a crashed tab drops reasonably quickly.
 */
export const PRESENCE_HEARTBEAT_MS = 10_000;

/**
 * Drop a presence row when `lastSeenAt` is this old. Three times the
 * client heartbeat so a single missed tick does not flicker the facepile.
 */
export const PRESENCE_EXPIRE_MS = 3 * PRESENCE_HEARTBEAT_MS;

/**
 * Who is in a channel. Heartbeats must not change list identity on every tick;
 * `online` is the field the UI cares about. `lastSeenAt` is for server TTL.
 */
export const PresenceSchema = Type.Object(
  {
    channelId: ChannelIdSchema,
    userId: UserIdSchema,
    sessionId: SessionIdSchema,
    online: Type.Boolean(),
    name: DisplayNameSchema,
    lastSeenAt: UnixTimeMsSchema,
  },
  { additionalProperties: false },
);

export type Presence = Static<typeof PresenceSchema>;
