import { presenceChanged } from "@clean-chat/core";
import { HeartbeatPresenceName, type HeartbeatPresence } from "@clean-chat/core/use-cases";
import type { AuthPort } from "../auth.js";
import type { EventPublisher } from "../event-publisher.js";
import type { PresenceRepository } from "../repositories/presence-repository.js";
import type { UnitOfWork } from "../transaction.js";
import { requireUser } from "./require-user.js";

/**
 * Mark this tab online in a channel. Auth required. Publishes
 * `presence-changed` after commit only when membership changes, not on
 * every heartbeat tick.
 */
export function createHeartbeatPresence(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  presence: PresenceRepository;
  events: EventPublisher;
}): HeartbeatPresence {
  return {
    name: HeartbeatPresenceName,
    async execute(input) {
      const user = await requireUser(deps.auth);
      const membershipChanged = await deps.uow.run(async (tx) => {
        const previous = await deps.presence.get(
          tx,
          input.channelId,
          input.sessionId,
        );
        await deps.presence.put(tx, {
          channelId: input.channelId,
          userId: user.id,
          sessionId: input.sessionId,
          online: true,
          name: user.name,
        });
        return (
          previous === null ||
          !previous.online ||
          previous.userId !== user.id
        );
      });

      if (membershipChanged) {
        await deps.events.publish(presenceChanged(input.channelId));
      }
    },
  };
}
