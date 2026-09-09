import type { PresenceRepository } from "@clean-chat/application";
import { presenceKey, type InMemoryStore } from "./store.js";

export function createInMemoryPresenceRepository(
  store: InMemoryStore,
): PresenceRepository {
  return {
    async listByChannel(_tx, channelId) {
      return [...store.presence.values()]
        .filter((row) => row.channelId === channelId)
        .map((row) => ({ ...row }));
    },

    async get(_tx, channelId, sessionId) {
      const row = store.presence.get(presenceKey(channelId, sessionId));
      return row ? { ...row } : null;
    },

    async put(_tx, presence) {
      store.presence.set(
        presenceKey(presence.channelId, presence.sessionId),
        { ...presence },
      );
    },

    async remove(_tx, channelId, sessionId) {
      store.presence.delete(presenceKey(channelId, sessionId));
    },
  };
}
