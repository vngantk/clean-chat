import { randomUUID } from "node:crypto";
import type { IdGenerator } from "@clean-chat/application";

/** Random ids (`crypto.randomUUID`) for channels, messages, and users. */
export function createRandomIdGenerator(): IdGenerator {
  return {
    next() {
      return randomUUID();
    },
  };
}
