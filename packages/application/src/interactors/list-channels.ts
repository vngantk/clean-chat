import { ListChannelsName, type ListChannels } from "@clean-chat/core/use-cases";
import { compareChannels } from "@clean-chat/core/domain";
import type { AuthPort } from "../auth.js";
import type { ChannelRepository } from "../repositories/channel-repository.js";
import type { UnitOfWork } from "../transaction.js";
import { requireUser } from "./require-user.js";

/**
 * Sidebar channel list. Auth required. Signed in → `general` first,
 * then alphabetical. One {@link UnitOfWork.run} for a consistent snapshot.
 */
export function createListChannels(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  channels: ChannelRepository;
}): ListChannels {
  return {
    name: ListChannelsName,
    async execute() {
      await requireUser(deps.auth);
      const channels = await deps.uow.run((tx) => deps.channels.list(tx));
      return [...channels].sort(compareChannels);
    },
  };
}
