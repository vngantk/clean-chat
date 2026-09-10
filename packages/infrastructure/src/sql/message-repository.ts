import type { MessageRepository } from "@clean-chat/application";
import {
  UNKNOWN_AUTHOR_NAME,
  type Message,
} from "@clean-chat/core/domain";
import type { Row } from "@libsql/client";
import {
  execute,
  query,
  requiredString,
  requiredUnixTime,
} from "./session.js";

const MESSAGE_SELECT = `
SELECT
  m.id AS id,
  m.channel_id AS channel_id,
  m.author_id AS author_id,
  m.body AS body,
  m.created_at AS created_at,
  COALESCE(u.name, ?) AS author_name
FROM messages m
LEFT JOIN users u ON u.id = m.author_id
`;

export function createSqlMessageRepository(): MessageRepository {
  return {
    async listLatestByChannel(tx, channelId, limit) {
      const rows = await query(
        tx,
        `
        SELECT * FROM (
          ${MESSAGE_SELECT}
          WHERE m.channel_id = ?
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT ?
        ) latest
        ORDER BY created_at ASC, id ASC
        `,
        [UNKNOWN_AUTHOR_NAME, channelId, limit],
      );
      return rows.map(toMessage);
    },

    async getById(tx, id) {
      const rows = await query(
        tx,
        `${MESSAGE_SELECT} WHERE m.id = ?`,
        [UNKNOWN_AUTHOR_NAME, id],
      );
      const row = rows[0];
      return row ? toMessage(row) : null;
    },

    async insert(tx, record) {
      await execute(
        tx,
        `INSERT INTO messages (id, channel_id, author_id, body, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          record.id,
          record.channelId,
          record.authorId,
          record.body,
          record.createdAt,
        ],
      );
    },

    async remove(tx, id) {
      await execute(tx, `DELETE FROM messages WHERE id = ?`, [id]);
    },
  };
}

function toMessage(row: Row): Message {
  return {
    id: requiredString(row, "id"),
    channelId: requiredString(row, "channel_id"),
    authorId: requiredString(row, "author_id"),
    body: requiredString(row, "body"),
    authorName: requiredString(row, "author_name"),
    createdAt: requiredUnixTime(row, "created_at"),
  };
}
