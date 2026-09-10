import { presenceChanged } from "@clean-chat/core";
import { DisconnectPresenceName, type DisconnectPresence } from "@clean-chat/core/use-cases";
import type { AuthPort } from "../auth.js";
import type { EventPublisher } from "../event-publisher.js";
import type { PresenceRepository } from "../repositories/presence-repository.js";
import type { UnitOfWork } from "../transaction.js";
import { requireUser } from "./require-user.js";

/** Thrown when disconnect targets another user's tab. */
export const PRESENCE_DISCONNECT_FORBIDDEN_ERROR =
  "You can only disconnect your own presence.";

/**
 * Drop this tab from the room. Auth required; only the signed-in user's
 * row may be removed. Publishes `presence-changed` after commit when an
 * online row is removed. Missing row is a no-op.
 *
 * The UI should use `fetch` with `keepalive` (and the bearer token), not
 * anonymous `sendBeacon`.
 */
export function createDisconnectPresence(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  presence: PresenceRepository;
  events: EventPublisher;
}): DisconnectPresence {
  return {
    name: DisconnectPresenceName,
    async execute(input) {
      const user = await requireUser(deps.auth);
      const wasOnline = await deps.uow.run(async (tx) => {
        const previous = await deps.presence.get(
          tx,
          input.channelId,
          input.sessionId,
        );
        if (!previous) {
          return false;
        }
        if (previous.userId !== user.id) {
          throw new Error(PRESENCE_DISCONNECT_FORBIDDEN_ERROR);
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
