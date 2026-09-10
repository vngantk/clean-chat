#!/usr/bin/env node

import { createServer } from "./server.js";
import { createSqlPersistence } from "./sql/index.js";
import type { CorsOrigins } from "./http/express-server.js";

const DEFAULT_SQLITE_URL = "file:./clean-chat.db";

const port = parsePort(process.env["PORT"]);
const host = process.env["HOST"] ?? "127.0.0.1";
const corsOrigins = parseCorsOrigins(process.env["CORS_ORIGIN"]);
const sqliteUrl =
  process.env["SQLITE_URL"] === undefined || process.env["SQLITE_URL"] === ""
    ? DEFAULT_SQLITE_URL
    : process.env["SQLITE_URL"];
const persistence = await createSqlPersistence({ url: sqliteUrl });
const server = createServer({
  port,
  host,
  corsOrigins,
  persistence,
});

await server.start();
console.log(
  `Clean Chat listening on http://${host}:${String(port)} (${sqliteUrl})`,
);

async function shutdown(): Promise<void> {
  await server.stop();
  persistence.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});

function parsePort(value: string | undefined): number {
  if (value === undefined || value === "") {
    return 3000;
  }
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 0) {
    throw new Error(`Invalid PORT: ${value}`);
  }
  return port;
}

/**
 * `CORS_ORIGIN=*` (default on loopback) or a comma-separated allowlist,
 * e.g. `http://127.0.0.1:5173,http://localhost:5173`. Binding off loopback
 * requires an explicit allowlist (`*` throws).
 */
function parseCorsOrigins(value: string | undefined): CorsOrigins {
  if (value === undefined || value === "" || value === "*") {
    return "*";
  }
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
