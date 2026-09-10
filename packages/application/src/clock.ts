import type { UnixTimeMs } from "@clean-chat/core/domain";

/** Current time for `createdAt`, typing expiry, and similar. Not transactional. */
export interface Clock {
  now(): UnixTimeMs;
}
