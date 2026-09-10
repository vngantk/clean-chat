import { messageListChanged } from "@clean-chat/core";
import type { SendMessage } from "@clean-chat/core/use-cases";
import {
  CHANNEL_NOT_FOUND_ERROR,
  MESSAGE_BODY_MAX_LENGTH,
  MESSAGE_EMPTY_ERROR,
  MESSAGE_TOO_LONG_ERROR,
  trimMessageBody,
} from "@clean-chat/core/domain";
import type { AuthPort } from "../auth.js";
import type { Clock } from "../clock.js";
import type { EventPublisher } from "../event-publisher.js";
import type { IdGenerator } from "../id-generator.js";
import type { ChannelRepository } from "../repositories/channel-repository.js";
import type { MessageRepository } from "../repositories/message-repository.js";
import type { UnitOfWork } from "../transaction.js";
import { requireUser } from "./require-user.js";

/**
 * Insert a message. Auth required. Publishes `message-list-changed` after
 * {@link UnitOfWork.run} commits.
 */
export function createSendMessage(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  channels: ChannelRepository;
  messages: MessageRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventPublisher;
}): SendMessage {
  return {
    async execute(input) {
      const user = await requireUser(deps.auth);
      const body = trimMessageBody(input.body);
      if (!body) {
        throw new Error(MESSAGE_EMPTY_ERROR);
      }
      if (body.length > MESSAGE_BODY_MAX_LENGTH) {
        throw new Error(MESSAGE_TOO_LONG_ERROR);
      }

      await deps.uow.run(async (tx) => {
        const channel = await deps.channels.getById(tx, input.channelId);
        if (!channel) {
          throw new Error(CHANNEL_NOT_FOUND_ERROR);
        }
        await deps.messages.insert(tx, {
          id: deps.ids.next(),
          channelId: input.channelId,
          authorId: user.id,
          body,
          createdAt: deps.clock.now(),
        });
      });

      await deps.events.publish(messageListChanged(input.channelId));
    },
  };
}
