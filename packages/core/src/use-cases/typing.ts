import { Type, type Static } from "@sinclair/typebox";
import {
  ChannelIdSchema,
  TypingSchema,
  type Typing,
} from "../domain/index.js";
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
export const ListTypingName = "list-typing" as const;

export type ListTyping = UseCase<
  ChannelScopedInput,
  Typing[],
  typeof ListTypingName
>;

/**
 * Auth required. Upsert the caller's typing row.
 * Publishes `typing-changed`.
 */
export const UpsertTypingName = "upsert-typing" as const;

export type UpsertTyping = UseCase<
  ChannelScopedInput,
  void,
  typeof UpsertTypingName
>;

/**
 * Auth required. Clear the caller's typing row.
 * Publishes `typing-changed` when a row is removed.
 */
export const ClearTypingName = "clear-typing" as const;

export type ClearTyping = UseCase<
  ChannelScopedInput,
  void,
  typeof ClearTypingName
>;
