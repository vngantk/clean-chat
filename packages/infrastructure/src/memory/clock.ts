import type { Clock } from "@clean-chat/application";

/** Wall clock. `now()` is `Date.now()` as Unix milliseconds. */
export function createSystemClock(): Clock {
  return {
    now() {
      return Date.now();
    },
  };
}
