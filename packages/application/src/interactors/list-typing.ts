import { ListTypingName, type ListTyping } from "@clean-chat/core/use-cases";
import { TYPING_EXPIRE_MS } from "@clean-chat/core/domain";
import type { AuthPort } from "../auth.js";
import type { Clock } from "../clock.js";
import type { TypingRepository } from "../repositories/typing-repository.js";
import type { UnitOfWork } from "../transaction.js";
import { requireUser } from "./require-user.js";

/**
 * Typing rows in a channel, excluding stale ones. Auth required.
 * The client hides the current user.
 */
export function createListTyping(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  typing: TypingRepository;
  clock: Clock;
}): ListTyping {
  return {
    name: ListTypingName,
    async execute(input) {
      await requireUser(deps.auth);
      const now = deps.clock.now();
      const rows = await deps.uow.run((tx) =>
        deps.typing.listByChannel(tx, input.channelId),
      );
      return rows.filter((row) => now - row.updatedAt < TYPING_EXPIRE_MS);
    },
  };
}
