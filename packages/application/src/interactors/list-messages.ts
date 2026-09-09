import type { ListMessages } from "@clean-chat/contracts/use-cases";
import { MESSAGE_LIST_LIMIT } from "@clean-chat/domain";
import type { AuthPort } from "../auth.js";
import type { MessageRepository } from "../repositories/message-repository.js";
import type { UnitOfWork } from "../transaction.js";

/**
 * Latest 50 messages in a channel, oldest first. Signed out → `[]`.
 */
export function createListMessages(deps: {
  auth: AuthPort;
  uow: UnitOfWork;
  messages: MessageRepository;
}): ListMessages {
  return {
    async execute(input) {
      const user = await deps.auth.currentUser();
      if (user === null) {
        return [];
      }
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
