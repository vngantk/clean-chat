import { presenceChanged } from "@clean-chat/core";
import { PRESENCE_EXPIRE_MS, type Presence } from "@clean-chat/core/domain";
import { ListPresenceName, type ListPresence } from "@clean-chat/core/use-cases";
import type { AuthPort } from "../auth.js";
import type { Clock } from "../clock.js";
import type { EventPublisher } from "../event-publisher.js";
import type { PresenceRepository } from "../repositories/presence-repository.js";
import type { UnitOfWork } from "../transaction.js";
import { requireUser } from "./require-user.js";

/**
 * Presence rows for a channel. Auth required. Stale rows (no heartbeat
 * within {@link PRESENCE_EXPIRE_MS}) are deleted; the UI shows
 * `online === true`. Publishes `presence-changed` when expiry removes an
 * online row so other tabs drop the ghost without waiting for the sweeper.
 */
export function createListPresence(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  presence: PresenceRepository;
  clock: Clock;
  events: EventPublisher;
}): ListPresence {
  return {
    name: ListPresenceName,
    async execute(input) {
      await requireUser(deps.auth);
      const now = deps.clock.now();
      const { rows, expiredOnline } = await deps.uow.run(async (tx) => {
        const listed = await deps.presence.listByChannel(tx, input.channelId);
        const fresh: Presence[] = [];
        let expiredOnline = false;
        for (const row of listed) {
          if (now - row.lastSeenAt >= PRESENCE_EXPIRE_MS) {
            await deps.presence.remove(tx, row.channelId, row.sessionId);
            if (row.online) {
              expiredOnline = true;
            }
            continue;
          }
          fresh.push(row);
        }
        return { rows: fresh, expiredOnline };
      });
      if (expiredOnline) {
        await deps.events.publish(presenceChanged(input.channelId));
      }
      return rows;
    },
  };
}
