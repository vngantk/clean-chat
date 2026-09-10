import type { SignIn } from "@clean-chat/core/use-cases";
import type { AuthPort } from "../auth.js";

/**
 * Sign in with email and password. No unit of work — {@link AuthPort} is
 * not transactional.
 */
export function createSignIn(auth: AuthPort): SignIn {
  return {
    execute(input) {
      return auth.signIn(input.email, input.password);
    },
  };
}
