import type { SignUp } from "@clean-chat/core/use-cases";
import { trimDisplayName } from "@clean-chat/core/domain";
import type { AuthPort } from "../auth.js";

/** Thrown when sign-up `name` is empty after trim. */
export const DISPLAY_NAME_EMPTY_ERROR = "Display name cannot be empty.";

/**
 * Create an account. Trims `name`, then calls {@link AuthPort.signUp}.
 * No unit of work — sessions and hashes are not the chat-table transaction.
 */
export function createSignUp(auth: AuthPort): SignUp {
  return {
    execute(input) {
      const name = trimDisplayName(input.name);
      if (!name) {
        throw new Error(DISPLAY_NAME_EMPTY_ERROR);
      }
      return auth.signUp(input.email, input.password, name);
    },
  };
}
