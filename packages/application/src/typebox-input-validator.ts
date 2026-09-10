import type { TSchema, Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import {
  INVALID_INPUT_ERROR,
  type InputValidator,
} from "./input-validator.js";

/**
 * Default {@link InputValidator}: TypeBox `Value.Check`. Does not coerce.
 */
export function createTypeBoxInputValidator(): InputValidator {
  return {
    parse<T extends TSchema>(schema: T, value: unknown): Static<T> {
      if (!Value.Check(schema, value)) {
        throw new Error(INVALID_INPUT_ERROR);
      }
      return value as Static<T>;
    },
  };
}
