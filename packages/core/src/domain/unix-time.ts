import { Type, type Static } from "@sinclair/typebox";

/**
 * Unix time in milliseconds. Used only for ordering and expiry, not display.
 */
export const UnixTimeMsSchema = Type.Integer({
  minimum: 0,
  description: "Unix time in milliseconds",
});

export type UnixTimeMs = Static<typeof UnixTimeMsSchema>;
