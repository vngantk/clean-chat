import { channelListChanged } from "@clean-chat/core";
import type { CreateChannel } from "@clean-chat/core/use-cases";
import {
  CHANNEL_NAME_LENGTH_ERROR,
  CHANNEL_NAME_MAX_LENGTH,
  CHANNEL_NAME_PATTERN,
  CHANNEL_NAME_PATTERN_ERROR,
  normalizeChannelName,
} from "@clean-chat/core/domain";
import type { AuthPort } from "../auth.js";
import type { EventPublisher } from "../event-publisher.js";
import type { IdGenerator } from "../id-generator.js";
import type { ChannelRepository } from "../repositories/channel-repository.js";
import type { UnitOfWork } from "../transaction.js";
import { requireUser } from "./require-user.js";

const CHANNEL_NAME_RE = new RegExp(CHANNEL_NAME_PATTERN);

/**
 * Create a channel, or return the existing slug. Auth required. Publishes
 * `channel-list-changed` after commit only when a row is inserted.
 */
export function createCreateChannel(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  channels: ChannelRepository;
  ids: IdGenerator;
  events: EventPublisher;
}): CreateChannel {
  return {
    async execute(input) {
      const user = await requireUser(deps.auth);
      const name = normalizeChannelName(input.name);
      if (!name || name.length > CHANNEL_NAME_MAX_LENGTH) {
        throw new Error(CHANNEL_NAME_LENGTH_ERROR);
      }
      if (!CHANNEL_NAME_RE.test(name)) {
        throw new Error(CHANNEL_NAME_PATTERN_ERROR);
      }

      const { id, inserted } = await deps.uow.run(async (tx) => {
        const existing = await deps.channels.getByName(tx, name);
        if (existing) {
          return { id: existing.id, inserted: false };
        }
        const id = deps.ids.next();
        await deps.channels.insert(tx, {
          id,
          name,
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
