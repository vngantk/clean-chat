import { typingChanged } from "@clean-chat/core";
import { UpsertTypingName, type UpsertTyping } from "@clean-chat/core/use-cases";
import type { AuthPort } from "../auth.js";
import type { Clock } from "../clock.js";
import type { EventPublisher } from "../event-publisher.js";
import type { TypingRepository } from "../repositories/typing-repository.js";
import type { UnitOfWork } from "../transaction.js";
import { requireUser } from "./require-user.js";

/**
 * Upsert the caller's typing row. Auth required. Publishes `typing-changed`
 * after {@link UnitOfWork.run} commits.
 */
export function createUpsertTyping(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  typing: TypingRepository;
  clock: Clock;
  events: EventPublisher;
}): UpsertTyping {
  return {
    name: UpsertTypingName,
    async execute(input) {
      const user = await requireUser(deps.auth);
      await deps.uow.run((tx) =>
        deps.typing.put(tx, {
          channelId: input.channelId,
          userId: user.id,
          name: user.name,
          updatedAt: deps.clock.now(),
        }),
      );
      await deps.events.publish(typingChanged(input.channelId));
    },
  };
}
