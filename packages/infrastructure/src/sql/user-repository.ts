import type { UserRepository } from "@clean-chat/application";
import type { User } from "@clean-chat/core/domain";
import type { Client, Row } from "@libsql/client";
import type { AuthUserStore } from "../auth-user-store.js";
import { query, requiredString } from "./session.js";

export function createSqlUserRepository(): UserRepository {
  return {
    async getById(tx, id) {
      const rows = await query(
        tx,
        `SELECT id, email, name FROM users WHERE id = ?`,
        [id],
      );
      const row = rows[0];
      return row ? toUser(row) : null;
    },
  };
}

/**
 * Auth writes users outside the chat-table unit of work (same as the
 * in-memory adapter). Message reads join this table inside a transaction.
 */
export function createSqlAuthUsers(client: Client): AuthUserStore {
  return {
    async getById(id) {
      const result = await client.execute({
        sql: `SELECT id, email, name FROM users WHERE id = ?`,
        args: [id],
      });
      const row = result.rows[0];
      return row ? toUser(row) : null;
    },

    async findByEmail(email) {
      const result = await client.execute({
        sql: `SELECT id, email, name FROM users WHERE email = ?`,
        args: [email],
      });
      const row = result.rows[0];
      return row ? toUser(row) : null;
    },

    async put(user) {
      await client.execute({
        sql: `
          INSERT INTO users (id, email, name) VALUES (?, ?, ?)
          ON CONFLICT (id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name
        `,
        args: [user.id, user.email, user.name],
      });
    },
  };
}

function toUser(row: Row): User {
  return {
    id: requiredString(row, "id"),
    email: requiredString(row, "email"),
    name: requiredString(row, "name"),
  };
}
