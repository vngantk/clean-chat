#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "./server.js";
import { createSqlPersistence } from "./sql/index.js";
import type { CorsOrigins } from "./http/express-server.js";

const DEFAULT_SQLITE_URL = "file:./clean-chat.db";
const STATIC_DIR_OFF = new Set(["off", "0", "false"]);

const port = parsePort(process.env["PORT"]);
const host = process.env["HOST"] ?? "127.0.0.1";
const corsOrigins = parseCorsOrigins(process.env["CORS_ORIGIN"]);
const staticDir = resolveStaticDir(process.env["STATIC_DIR"]);
const sqliteUrl =
  process.env["SQLITE_URL"] === undefined || process.env["SQLITE_URL"] === ""
    ? DEFAULT_SQLITE_URL
    : process.env["SQLITE_URL"];
const persistence = await createSqlPersistence({ url: sqliteUrl });
const server = createServer({
  port,
  host,
  persistence,
  ...(corsOrigins === undefined ? {} : { corsOrigins }),
  ...(staticDir === undefined ? {} : { staticDir }),
});

await server.start();
console.log(
  `Clean Chat listening on http://${host}:${String(port)} (${sqliteUrl})${staticDir === undefined ? "" : `; SPA ${staticDir}`}`,
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
 * `CORS_ORIGIN` unset lets the server pick a default (`*` on loopback,
 * same-origin when serving the SPA). `"*"` allows any origin (loopback
 * only). `same-origin` or empty disables CORS headers. Otherwise a
 * comma-separated allowlist, e.g. `http://127.0.0.1:5173`. Binding off
 * loopback without the SPA requires an explicit allowlist (`*` throws).
 */
function parseCorsOrigins(value: string | undefined): CorsOrigins | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "same-origin") {
    return [];
  }
  if (trimmed === "*") {
    return "*";
  }
  return trimmed
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Vite `dist` to serve at `/`. `STATIC_DIR=off` is API-only. Unset uses
 * `@clean-chat/web`'s `dist` when `index.html` is present.
 */
function resolveStaticDir(value: string | undefined): string | undefined {
  if (value !== undefined && STATIC_DIR_OFF.has(value.trim().toLowerCase())) {
    return undefined;
  }
  if (value !== undefined && value.trim() !== "") {
    return path.resolve(value);
  }
  const bundled = fileURLToPath(new URL("../../web/dist", import.meta.url));
  if (existsSync(path.join(bundled, "index.html"))) {
    return bundled;
  }
  return undefined;
}
