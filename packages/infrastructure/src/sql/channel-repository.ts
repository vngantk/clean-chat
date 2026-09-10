import type { ChannelRepository } from "@clean-chat/application";
import type { Channel } from "@clean-chat/core/domain";
import type { Row } from "@libsql/client";
import { execute, query, requiredString } from "./session.js";

export function createSqlChannelRepository(): ChannelRepository {
  return {
    async list(tx) {
      const rows = await query(
        tx,
        `SELECT id, name, created_by FROM channels`,
      );
      return rows.map(toChannel);
    },

    async getById(tx, id) {
      const rows = await query(
        tx,
        `SELECT id, name, created_by FROM channels WHERE id = ?`,
        [id],
      );
      const row = rows[0];
      return row ? toChannel(row) : null;
    },

    async getByName(tx, name) {
      const rows = await query(
        tx,
        `SELECT id, name, created_by FROM channels WHERE name = ?`,
        [name],
      );
      const row = rows[0];
      return row ? toChannel(row) : null;
    },

    async insert(tx, channel) {
      await execute(
        tx,
        `INSERT INTO channels (id, name, created_by) VALUES (?, ?, ?)`,
        [channel.id, channel.name, channel.createdBy],
      );
    },
  };
}

function toChannel(row: Row): Channel {
  return {
    id: requiredString(row, "id"),
    name: requiredString(row, "name"),
    createdBy: requiredString(row, "created_by"),
  };
}
