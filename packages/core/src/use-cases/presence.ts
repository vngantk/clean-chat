import { Type, type Static } from "@sinclair/typebox";
import {
  ChannelIdSchema,
  PresenceSchema,
  SessionIdSchema,
  type Presence,
} from "../domain/index.js";
import type { UseCase } from "./use-case.js";

export const ListPresenceInputSchema = Type.Object(
  {
    channelId: ChannelIdSchema,
  },
  { additionalProperties: false },
);

export type ListPresenceInput = Static<typeof ListPresenceInputSchema>;

export const PresenceListSchema = Type.Array(PresenceSchema);

export type PresenceList = Static<typeof PresenceListSchema>;

/**
 * Presence rows for a channel. UI shows `online === true`.
 */
export const ListPresenceName = "list-presence" as const;

export type ListPresence = UseCase<
  ListPresenceInput,
  Presence[],
  typeof ListPresenceName
>;

export const HeartbeatPresenceInputSchema = Type.Object(
  {
    channelId: ChannelIdSchema,
    sessionId: SessionIdSchema,
  },
  { additionalProperties: false },
);

export type HeartbeatPresenceInput = Static<typeof HeartbeatPresenceInputSchema>;

/**
 * Auth required. `userId` on the row is the actor.
 * Publishes `presence-changed` only when membership actually changes,
 * not on every heartbeat tick.
 */
export const HeartbeatPresenceName = "heartbeat-presence" as const;

export type HeartbeatPresence = UseCase<
  HeartbeatPresenceInput,
  void,
  typeof HeartbeatPresenceName
>;

export const DisconnectPresenceInputSchema = Type.Object(
  {
    channelId: ChannelIdSchema,
    sessionId: SessionIdSchema,
  },
  { additionalProperties: false },
);

export type DisconnectPresenceInput = Static<
  typeof DisconnectPresenceInputSchema
>;

/**
 * Drop this tab from the room. Auth required (keepalive fetch, not anonymous
 * `sendBeacon`). Publishes `presence-changed` when membership changes.
 */
export const DisconnectPresenceName = "disconnect-presence" as const;

export type DisconnectPresence = UseCase<
  DisconnectPresenceInput,
  void,
  typeof DisconnectPresenceName
>;
