import { Type, type Static } from "@sinclair/typebox";
import {
  ChannelIdSchema,
  TypingSchema,
  type Typing,
} from "@clean-chat/domain";
import type { UseCase } from "./use-case.js";

export const ChannelScopedInputSchema = Type.Object(
  {
    channelId: ChannelIdSchema,
  },
  { additionalProperties: false },
);

export type ChannelScopedInput = Static<typeof ChannelScopedInputSchema>;

export const TypingListSchema = Type.Array(TypingSchema);

export type TypingList = Static<typeof TypingListSchema>;

/**
 * Everyone currently typing in the channel (client hides self).
 */
export type ListTyping = UseCase<ChannelScopedInput, Typing[]>;

/**
 * Auth required. Upsert the caller's typing row.
 * Publishes `typing-changed`.
 */
export type UpsertTyping = UseCase<ChannelScopedInput, void>;

/**
 * Auth required. Clear the caller's typing row.
 * Publishes `typing-changed` when a row is removed.
 */
export type ClearTyping = UseCase<ChannelScopedInput, void>;
