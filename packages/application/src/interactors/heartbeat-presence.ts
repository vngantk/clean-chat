import { presenceChanged } from "@clean-chat/core";
import { HeartbeatPresenceName, type HeartbeatPresence } from "@clean-chat/core/use-cases";
import type { AuthPort } from "../auth.js";
import type { Clock } from "../clock.js";
import type { EventPublisher } from "../event-publisher.js";
import type { PresenceRepository } from "../repositories/presence-repository.js";
import type { UnitOfWork } from "../transaction.js";
import { requireUser } from "./require-user.js";

/**
 * Mark this tab online in a channel. Auth required. A tab is only in one
 * room: other channels for this `sessionId` are cleared. Publishes
 * `presence-changed` after commit when this room’s membership changes or
 * when the tab leaves another room — not on every heartbeat tick.
 * `lastSeenAt` is refreshed so the server TTL can drop crashed tabs.
 */
export function createHeartbeatPresence(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  presence: PresenceRepository;
  clock: Clock;
  events: EventPublisher;
}): HeartbeatPresence {
  return {
    name: HeartbeatPresenceName,
    async execute(input) {
      const user = await requireUser(deps.auth);
      const { joined, left } = await deps.uow.run(async (tx) => {
        const left = await deps.presence.removeSessionFromOtherChannels(
          tx,
          input.sessionId,
          input.channelId,
        );
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
          lastSeenAt: deps.clock.now(),
        });
        return {
          joined:
            previous === null ||
            !previous.online ||
            previous.userId !== user.id,
          left,
        };
      });

      if (joined) {
        await deps.events.publish(presenceChanged(input.channelId));
      }
      for (const channelId of left) {
        await deps.events.publish(presenceChanged(channelId));
      }
    },
  };
}
