import type { TypingRepository } from "@clean-chat/application";
import type { Typing } from "@clean-chat/core/domain";
import type { Row } from "@libsql/client";
import {
  execute,
  query,
  requiredString,
  requiredUnixTime,
} from "./session.js";

export function createSqlTypingRepository(): TypingRepository {
  return {
    async listByChannel(tx, channelId) {
      const rows = await query(
        tx,
        `SELECT channel_id, user_id, name, updated_at
         FROM typing WHERE channel_id = ?`,
        [channelId],
      );
      return rows.map(toTyping);
    },

    async put(tx, typing) {
      await execute(
        tx,
        `
        INSERT INTO typing (channel_id, user_id, name, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (channel_id, user_id) DO UPDATE SET
          name = excluded.name,
          updated_at = excluded.updated_at
        `,
        [typing.channelId, typing.userId, typing.name, typing.updatedAt],
      );
    },

    async remove(tx, channelId, userId) {
      await execute(
        tx,
        `DELETE FROM typing WHERE channel_id = ? AND user_id = ?`,
        [channelId, userId],
      );
    },
  };
}

function toTyping(row: Row): Typing {
  return {
    channelId: requiredString(row, "channel_id"),
    userId: requiredString(row, "user_id"),
    name: requiredString(row, "name"),
    updatedAt: requiredUnixTime(row, "updated_at"),
  };
}
