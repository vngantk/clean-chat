import type { MessageRepository, NewMessage } from "@clean-chat/application";
import { UNKNOWN_AUTHOR_NAME, type Message } from "@clean-chat/domain";
import type { InMemoryStore } from "./store.js";

export function createInMemoryMessageRepository(
  store: InMemoryStore,
): MessageRepository {
  return {
    async listLatestByChannel(_tx, channelId, limit) {
      const latest = [...store.messages.values()]
        .filter((row) => row.channelId === channelId)
        .sort(compareNewestFirst)
        .slice(0, limit)
        .reverse();
      return latest.map((row) => toMessage(store, row));
    },

    async getById(_tx, id) {
      const row = store.messages.get(id);
      return row ? toMessage(store, row) : null;
    },

    async insert(_tx, record) {
      store.messages.set(record.id, { ...record });
    },

    async remove(_tx, id) {
      store.messages.delete(id);
    },
  };
}

function compareNewestFirst(a: NewMessage, b: NewMessage): number {
  if (a.createdAt !== b.createdAt) {
    return b.createdAt - a.createdAt;
  }
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

function toMessage(store: InMemoryStore, row: NewMessage): Message {
  return {
    ...row,
    authorName: store.users.get(row.authorId)?.name ?? UNKNOWN_AUTHOR_NAME,
  };
}
