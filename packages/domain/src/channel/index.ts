import { Type, type Static } from "@sinclair/typebox";
import { UserIdSchema } from "../user/index.js";

/**
 * Stable unique identifier for a channel.
 */
export const ChannelIdSchema = Type.String({
  minLength: 1,
  description: "Stable unique channel id",
});

export type ChannelId = Static<typeof ChannelIdSchema>;

/** Default room created on first chat-shell mount. Listed first in channel lists. */
export const GENERAL_CHANNEL_NAME = "general";

/** Maximum length of a channel slug after normalization. */
export const CHANNEL_NAME_MAX_LENGTH = 32;

/** Stored slug: lowercase letters, digits, and hyphens only. */
export const CHANNEL_NAME_PATTERN = "^[a-z0-9-]+$";

/** Product error when the slug is empty or longer than 32 after normalize. */
export const CHANNEL_NAME_LENGTH_ERROR =
  "Channel names must be 1–32 characters.";

/** Product error when the slug contains characters outside {@link CHANNEL_NAME_PATTERN}. */
export const CHANNEL_NAME_PATTERN_ERROR =
  "Use letters, numbers, and hyphens only.";

/**
 * Channel slug after normalize (trim, lowercase, whitespace → `-`).
 */
export const ChannelNameSchema = Type.String({
  minLength: 1,
  maxLength: CHANNEL_NAME_MAX_LENGTH,
  pattern: CHANNEL_NAME_PATTERN,
  description: "Channel slug",
});

export type ChannelName = Static<typeof ChannelNameSchema>;

/**
 * Shared room. Not private; every signed-in user sees every channel.
 * `name` is intended unique.
 */
export const ChannelSchema = Type.Object(
  {
    id: ChannelIdSchema,
    name: ChannelNameSchema,
    createdBy: UserIdSchema,
  },
  { additionalProperties: false },
);

export type Channel = Static<typeof ChannelSchema>;

/**
 * Normalize a raw create-channel input into a slug.
 *
 * @param name Raw input from the create-channel form.
 * @returns Lowercase slug with runs of whitespace turned into hyphens.
 */
export function normalizeChannelName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Channel list order: `general` first, then alphabetical by name.
 */
export function compareChannels(a: Channel, b: Channel): number {
  if (a.name === GENERAL_CHANNEL_NAME) return -1;
  if (b.name === GENERAL_CHANNEL_NAME) return 1;
  return a.name.localeCompare(b.name);
}
