import type { PresenceRepository } from "@clean-chat/application";
import type { ChannelId, Presence } from "@clean-chat/core/domain";
import type { Row } from "@libsql/client";
import {
  execute,
  query,
  requiredBoolean,
  requiredString,
} from "./session.js";

export function createSqlPresenceRepository(): PresenceRepository {
  return {
    async listByChannel(tx, channelId) {
      const rows = await query(
        tx,
        `SELECT channel_id, user_id, session_id, online, name
         FROM presence WHERE channel_id = ?`,
        [channelId],
      );
      return rows.map(toPresence);
    },

    async get(tx, channelId, sessionId) {
      const rows = await query(
        tx,
        `SELECT channel_id, user_id, session_id, online, name
         FROM presence WHERE channel_id = ? AND session_id = ?`,
        [channelId, sessionId],
      );
      const row = rows[0];
      return row ? toPresence(row) : null;
    },

    async put(tx, presence) {
      await execute(
        tx,
        `
        INSERT INTO presence (channel_id, session_id, user_id, online, name)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (channel_id, session_id) DO UPDATE SET
          user_id = excluded.user_id,
          online = excluded.online,
          name = excluded.name
        `,
        [
          presence.channelId,
          presence.sessionId,
          presence.userId,
          presence.online ? 1 : 0,
          presence.name,
        ],
      );
    },

    async remove(tx, channelId, sessionId) {
      await execute(
        tx,
        `DELETE FROM presence WHERE channel_id = ? AND session_id = ?`,
        [channelId, sessionId],
      );
    },

    async removeSessionFromOtherChannels(tx, sessionId, keepChannelId) {
      const rows = await query(
        tx,
        `
        DELETE FROM presence
        WHERE session_id = ? AND channel_id != ?
        RETURNING channel_id, online
        `,
        [sessionId, keepChannelId],
      );
      const left: ChannelId[] = [];
      for (const row of rows) {
        if (requiredBoolean(row, "online")) {
          left.push(requiredString(row, "channel_id"));
        }
      }
      return left;
    },
  };
}

function toPresence(row: Row): Presence {
  return {
    channelId: requiredString(row, "channel_id"),
    userId: requiredString(row, "user_id"),
    sessionId: requiredString(row, "session_id"),
    online: requiredBoolean(row, "online"),
    name: requiredString(row, "name"),
  };
}
