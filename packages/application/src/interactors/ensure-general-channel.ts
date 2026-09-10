import { channelListChanged } from "@clean-chat/core";
import { EnsureGeneralChannelName, type EnsureGeneralChannel } from "@clean-chat/core/use-cases";
import { GENERAL_CHANNEL_NAME } from "@clean-chat/core/domain";
import type { AuthPort } from "../auth.js";
import type { EventPublisher } from "../event-publisher.js";
import type { IdGenerator } from "../id-generator.js";
import type { ChannelRepository } from "../repositories/channel-repository.js";
import type { UnitOfWork } from "../transaction.js";
import { requireUser } from "./require-user.js";

/**
 * Insert `general` if missing. Auth required. Publishes `channel-list-changed`
 * after commit only when a row is inserted.
 */
export function createEnsureGeneralChannel(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  channels: ChannelRepository;
  ids: IdGenerator;
  events: EventPublisher;
}): EnsureGeneralChannel {
  return {
    name: EnsureGeneralChannelName,
    async execute() {
      const user = await requireUser(deps.auth);
      const { id, inserted } = await deps.uow.run(async (tx) => {
        const existing = await deps.channels.getByName(
          tx,
          GENERAL_CHANNEL_NAME,
        );
        if (existing) {
          return { id: existing.id, inserted: false };
        }
        const id = deps.ids.next();
        await deps.channels.insert(tx, {
          id,
          name: GENERAL_CHANNEL_NAME,
          createdBy: user.id,
        });
        return { id, inserted: true };
      });

      if (inserted) {
        await deps.events.publish(channelListChanged());
      }
      return id;
    },
  };
}
