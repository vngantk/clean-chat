import { GetCurrentUserName, type GetCurrentUser } from "@clean-chat/core/use-cases";
import type { AuthPort } from "../auth.js";

/**
 * Session lookup. No unit of work — {@link AuthPort} is not transactional.
 */
export function createGetCurrentUser(auth: AuthPort): GetCurrentUser {
  return {
    name: GetCurrentUserName,
    execute() {
      return auth.currentUser();
    },
  };
}
