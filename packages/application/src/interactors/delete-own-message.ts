import { messageListChanged } from "@clean-chat/core";
import { DeleteOwnMessageName, type DeleteOwnMessage } from "@clean-chat/core/use-cases";
import { MESSAGE_DELETE_FORBIDDEN_ERROR } from "@clean-chat/core/domain";
import type { AuthPort } from "../auth.js";
import type { EventPublisher } from "../event-publisher.js";
import type { MessageRepository } from "../repositories/message-repository.js";
import type { UnitOfWork } from "../transaction.js";
import { requireUser } from "./require-user.js";

/**
 * Delete the caller's message. Missing message is a no-op. Publishes
 * `message-list-changed` after commit only when a row is deleted.
 */
export function createDeleteOwnMessage(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  messages: MessageRepository;
  events: EventPublisher;
}): DeleteOwnMessage {
  return {
    name: DeleteOwnMessageName,
    async execute(input) {
      const user = await requireUser(deps.auth);
      const channelId = await deps.uow.run(async (tx) => {
        const message = await deps.messages.getById(tx, input.messageId);
        if (!message) {
          return null;
        }
        if (message.authorId !== user.id) {
          throw new Error(MESSAGE_DELETE_FORBIDDEN_ERROR);
        }
        await deps.messages.remove(tx, input.messageId);
        return message.channelId;
      });

      if (channelId !== null) {
        await deps.events.publish(messageListChanged(channelId));
      }
    },
  };
}
