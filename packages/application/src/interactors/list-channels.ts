import type { ListChannels } from "@clean-chat/contracts/use-cases";
import { compareChannels } from "@clean-chat/domain";
import type { AuthPort } from "../auth.js";
import type { ChannelRepository } from "../repositories/channel-repository.js";
import type { UnitOfWork } from "../transaction.js";

/**
 * Sidebar channel list. Signed out → `[]`. Signed in → `general` first,
 * then alphabetical. One {@link UnitOfWork.run} for a consistent snapshot.
 */
export function createListChannels(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  channels: ChannelRepository;
}): ListChannels {
  return {
    async execute() {
      const user = await deps.auth.currentUser();
      if (user === null) {
        return [];
      }
      const channels = await deps.uow.run((tx) => deps.channels.list(tx));
      return [...channels].sort(compareChannels);
    },
  };
}
