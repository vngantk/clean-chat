import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import type {
  ChannelRepository,
  MessageRepository,
  PresenceRepository,
  TypingRepository,
  UnitOfWork,
  UserRepository,
} from "@clean-chat/application";
import type { AuthUserStore } from "../auth-user-store.js";
import { createSqlChannelRepository } from "./channel-repository.js";
import { createSqlMessageRepository } from "./message-repository.js";
import { createSqlPresenceRepository } from "./presence-repository.js";
import { SCHEMA_SQL } from "./schema.js";
import {
  createSqlAuthUsers,
  createSqlUserRepository,
} from "./user-repository.js";
import { createSqlTypingRepository } from "./typing-repository.js";
import { createSqlUnitOfWork } from "./unit-of-work.js";

export type SqlPersistence = {
  readonly uow: UnitOfWork;
  readonly channels: ChannelRepository;
  readonly messages: MessageRepository;
  readonly users: UserRepository;
  readonly typing: TypingRepository;
  readonly presence: PresenceRepository;
  readonly authUsers: AuthUserStore;
  close(): void;
};

export type SqlPersistenceOptions = {
  /**
   * libSQL URL. `file:./clean-chat.db` persists on disk. Omit for an
   * isolated temporary file (tests).
   */
  url?: string;
};

/**
 * SQLite persistence via libSQL. One {@link UnitOfWork.run} is one write
 * transaction. Auth still hashes passwords in process; user rows live in
 * the `users` table so message reads can join `authorName`.
 */
export async function createSqlPersistence(
  options: SqlPersistenceOptions = {},
): Promise<SqlPersistence> {
  const url = options.url ?? (await temporaryFileUrl());
  const client = createClient({ url: normalizeUrl(url) });
  try {
    await client.executeMultiple(SCHEMA_SQL);
    await ensurePresenceLastSeenAt(client);
  } catch (error) {
    client.close();
    throw error;
  }
  return persistenceFromClient(client);
}

async function ensurePresenceLastSeenAt(client: Client): Promise<void> {
  const info = await client.execute("PRAGMA table_info(presence)");
  const hasColumn = info.rows.some((row) => row.name === "last_seen_at");
  if (!hasColumn) {
    await client.execute(
      "ALTER TABLE presence ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0",
    );
  }
}

function persistenceFromClient(client: Client): SqlPersistence {
  return {
    uow: createSqlUnitOfWork(client),
    channels: createSqlChannelRepository(),
    messages: createSqlMessageRepository(),
    users: createSqlUserRepository(),
    typing: createSqlTypingRepository(),
    presence: createSqlPresenceRepository(),
    authUsers: createSqlAuthUsers(client),
    close() {
      client.close();
    },
  };
}

function normalizeUrl(url: string): string {
  if (
    url === ":memory:" ||
    url.startsWith("file:") ||
    url.startsWith("libsql:") ||
    url.startsWith("http:") ||
    url.startsWith("https:") ||
    url.startsWith("ws:") ||
    url.startsWith("wss:")
  ) {
    return url;
  }
  return `file:${url}`;
}

async function temporaryFileUrl(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "clean-chat-"));
  return `file://${join(dir, "chat.db")}`;
}
