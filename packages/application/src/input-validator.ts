import type { TSchema, Static } from "@sinclair/typebox";

/** Thrown when {@link InputValidator.parse} rejects a value. */
export const INVALID_INPUT_ERROR = "Invalid input";

/**
 * Pluggable check that `value` matches a TypeBox (or compatible) schema.
 * The composition root injects an implementation; interactors stay schema-agnostic.
 */
export interface InputValidator {
  parse<T extends TSchema>(schema: T, value: unknown): Static<T>;
}
