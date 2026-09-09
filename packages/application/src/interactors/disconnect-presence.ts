import { presenceChanged } from "@clean-chat/contracts";
import type { DisconnectPresence } from "@clean-chat/contracts/use-cases";
import type { EventPublisher } from "../event-publisher.js";
import type { PresenceRepository } from "../repositories/presence-repository.js";
import type { UnitOfWork } from "../transaction.js";

/**
 * Drop this tab from the room. Auth is skipped (unload / sendBeacon).
 * Publishes `presence-changed` after commit when an online row is removed.
 */
export function createDisconnectPresence(deps: {
  uow: UnitOfWork;
  presence: PresenceRepository;
  events: EventPublisher;
}): DisconnectPresence {
  return {
    async execute(input) {
      const wasOnline = await deps.uow.run(async (tx) => {
        const previous = await deps.presence.get(
          tx,
          input.channelId,
          input.sessionId,
        );
        if (!previous) {
          return false;
        }
        await deps.presence.remove(tx, input.channelId, input.sessionId);
        return previous.online;
      });

      if (wasOnline) {
        await deps.events.publish(presenceChanged(input.channelId));
      }
    },
  };
}
