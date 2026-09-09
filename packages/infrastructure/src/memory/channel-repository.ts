import type { ChannelRepository } from "@clean-chat/application";
import type { InMemoryStore } from "./store.js";

export function createInMemoryChannelRepository(
  store: InMemoryStore,
): ChannelRepository {
  return {
    async list(_tx) {
      return [...store.channels.values()].map((channel) => ({ ...channel }));
    },

    async getById(_tx, id) {
      const channel = store.channels.get(id);
      return channel ? { ...channel } : null;
    },

    async getByName(_tx, name) {
      for (const channel of store.channels.values()) {
        if (channel.name === name) {
          return { ...channel };
        }
      }
      return null;
    },

    async insert(_tx, channel) {
      store.channels.set(channel.id, { ...channel });
    },
  };
}
