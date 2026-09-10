import { ListPresenceName, type ListPresence } from "@clean-chat/core/use-cases";
import type { AuthPort } from "../auth.js";
import type { PresenceRepository } from "../repositories/presence-repository.js";
import type { UnitOfWork } from "../transaction.js";

/**
 * Presence rows for a channel. Signed out → `[]`. The UI shows
 * `online === true`.
 */
export function createListPresence(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  presence: PresenceRepository;
}): ListPresence {
  return {
    name: ListPresenceName,
    async execute(input) {
      const user = await deps.auth.currentUser();
      if (user === null) {
        return [];
      }
      return deps.uow.run((tx) =>
        deps.presence.listByChannel(tx, input.channelId),
      );
    },
  };
}
