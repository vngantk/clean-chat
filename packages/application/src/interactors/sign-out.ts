import { SignOutName, type SignOut } from "@clean-chat/core/use-cases";
import type { AuthPort } from "../auth.js";

/**
 * End the session. No unit of work — {@link AuthPort} is not transactional.
 */
export function createSignOut(auth: AuthPort): SignOut {
  return {
    name: SignOutName,
    execute() {
      return auth.signOut();
    },
  };
}
