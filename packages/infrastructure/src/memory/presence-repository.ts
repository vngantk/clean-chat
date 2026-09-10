import type { PresenceRepository } from "@clean-chat/application";
import type { ChannelId } from "@clean-chat/core/domain";
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

    async removeSessionFromOtherChannels(_tx, sessionId, keepChannelId) {
      const left: ChannelId[] = [];
      for (const [key, row] of store.presence) {
        if (row.sessionId !== sessionId || row.channelId === keepChannelId) {
          continue;
        }
        store.presence.delete(key);
        if (row.online) {
          left.push(row.channelId);
        }
      }
      return left;
    },

    async removeExpired(_tx, now, expireMs) {
      const left: ChannelId[] = [];
      for (const [key, row] of store.presence) {
        if (now - row.lastSeenAt < expireMs) {
          continue;
        }
        store.presence.delete(key);
        if (row.online) {
          left.push(row.channelId);
        }
      }
      return left;
    },
  };
}
