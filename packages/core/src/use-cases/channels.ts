import { Type, type Static } from "@sinclair/typebox";
import {
  ChannelIdSchema,
  ChannelSchema,
  type Channel,
  type ChannelId,
} from "../domain/index.js";
import type { UseCase } from "./use-case.js";

export const ChannelListSchema = Type.Array(ChannelSchema);

export type ChannelList = Static<typeof ChannelListSchema>;

/**
 * All channels, `general` first then alphabetical.
 * Signed out → `[]`.
 */
export const ListChannelsName = "list-channels" as const;

export type ListChannels = UseCase<void, Channel[], typeof ListChannelsName>;

/**
 * Insert `general` if missing. Auth required.
 */
export const EnsureGeneralChannelName = "ensure-general-channel" as const;

export type EnsureGeneralChannel = UseCase<
  void,
  ChannelId,
  typeof EnsureGeneralChannelName
>;

/**
 * Raw create-channel field. Normalize then validate as a channel slug.
 */
export const CreateChannelInputSchema = Type.Object(
  {
    name: Type.String(),
  },
  { additionalProperties: false },
);

export type CreateChannelInput = Static<typeof CreateChannelInputSchema>;

export const CreateChannelOutputSchema = ChannelIdSchema;

export type CreateChannelOutput = ChannelId;

/**
 * Create or return the existing channel with that slug.
 * Publishes `channel-list-changed` when a new row is inserted.
 */
export const CreateChannelName = "create-channel" as const;

export type CreateChannel = UseCase<
  CreateChannelInput,
  ChannelId,
  typeof CreateChannelName
>;
