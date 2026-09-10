import { ListMessagesName, type ListMessages } from "@clean-chat/core/use-cases";
import { MESSAGE_LIST_LIMIT } from "@clean-chat/core/domain";
import type { AuthPort } from "../auth.js";
import type { MessageRepository } from "../repositories/message-repository.js";
import type { UnitOfWork } from "../transaction.js";
import { requireUser } from "./require-user.js";

/**
 * Latest 50 messages in a channel, oldest first. Auth required.
 */
export function createListMessages(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  messages: MessageRepository;
}): ListMessages {
  return {
    name: ListMessagesName,
    async execute(input) {
      await requireUser(deps.auth);
      return deps.uow.run((tx) =>
        deps.messages.listLatestByChannel(
          tx,
          input.channelId,
          MESSAGE_LIST_LIMIT,
        ),
      );
    },
  };
}
