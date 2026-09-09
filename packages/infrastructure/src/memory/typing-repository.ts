import type { TypingRepository } from "@clean-chat/application";
import { typingKey, type InMemoryStore } from "./store.js";

export function createInMemoryTypingRepository(
  store: InMemoryStore,
): TypingRepository {
  return {
    async listByChannel(_tx, channelId) {
      return [...store.typing.values()]
        .filter((row) => row.channelId === channelId)
        .map((row) => ({ ...row }));
    },

    async put(_tx, typing) {
      store.typing.set(typingKey(typing.channelId, typing.userId), {
        ...typing,
      });
    },

    async remove(_tx, channelId, userId) {
      store.typing.delete(typingKey(channelId, userId));
    },
  };
}
