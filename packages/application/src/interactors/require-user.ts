import type { User } from "@clean-chat/domain";
import type { AuthPort } from "../auth.js";

/** Thrown when a write is called without a session. */
export const NOT_AUTHENTICATED_ERROR = "Not authenticated";

/**
 * Resolve the signed-in actor, or throw {@link NOT_AUTHENTICATED_ERROR}.
 */
export async function requireUser(auth: AuthPort): Promise<User> {
  const user = await auth.currentUser();
  if (user === null) {
    throw new Error(NOT_AUTHENTICATED_ERROR);
  }
  return user;
}
