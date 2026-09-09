import { typingChanged } from "@clean-chat/contracts";
import type { ClearTyping } from "@clean-chat/contracts/use-cases";
import type { AuthPort } from "../auth.js";
import type { EventPublisher } from "../event-publisher.js";
import type { TypingRepository } from "../repositories/typing-repository.js";
import type { UnitOfWork } from "../transaction.js";
import { requireUser } from "./require-user.js";

/**
 * Clear the caller's typing row. Auth required. Publishes `typing-changed`
 * after commit only when a row is removed.
 */
export function createClearTyping(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  typing: TypingRepository;
  events: EventPublisher;
}): ClearTyping {
  return {
    async execute(input) {
      const user = await requireUser(deps.auth);
      const removed = await deps.uow.run(async (tx) => {
        const rows = await deps.typing.listByChannel(tx, input.channelId);
        const mine = rows.some((row) => row.userId === user.id);
        if (!mine) {
          return false;
        }
        await deps.typing.remove(tx, input.channelId, user.id);
        return true;
      });

      if (removed) {
        await deps.events.publish(typingChanged(input.channelId));
      }
    },
  };
}
