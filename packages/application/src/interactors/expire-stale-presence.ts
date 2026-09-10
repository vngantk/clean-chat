import { presenceChanged } from "@clean-chat/core";
import { PRESENCE_EXPIRE_MS } from "@clean-chat/core/domain";
import type { Clock } from "../clock.js";
import type { EventPublisher } from "../event-publisher.js";
import type { PresenceRepository } from "../repositories/presence-repository.js";
import type { UnitOfWork } from "../transaction.js";

/**
 * Delete presence rows older than {@link PRESENCE_EXPIRE_MS} and publish
 * `presence-changed` for rooms whose online membership changed. Run on a
 * short interval so crashed tabs drop without waiting for the next list.
 */
export function createExpireStalePresence(deps: {
  uow: UnitOfWork;
  presence: PresenceRepository;
  clock: Clock;
  events: EventPublisher;
}): () => Promise<void> {
  return async () => {
    const now = deps.clock.now();
    const left = await deps.uow.run((tx) =>
      deps.presence.removeExpired(tx, now, PRESENCE_EXPIRE_MS),
    );
    for (const channelId of left) {
      await deps.events.publish(presenceChanged(channelId));
    }
  };
}
