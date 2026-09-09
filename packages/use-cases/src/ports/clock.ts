import type { UnixTimeMs } from "@clean-chat/domain";

/** Current time for `createdAt`, typing expiry, and similar. Not transactional. */
export interface Clock {
  now(): UnixTimeMs;
}
