#!/usr/bin/env node

import { createBackend } from "./backend.js";
import type { CorsOrigins } from "./http/express-server.js";

const port = parsePort(process.env["PORT"]);
const host = process.env["HOST"] ?? "127.0.0.1";
const corsOrigins = parseCorsOrigins(process.env["CORS_ORIGIN"]);
const { server } = createBackend({ port, host, corsOrigins });

await server.start();
console.log(`Clean Chat listening on http://${server.getHost()}:${String(server.getPort())}`);

async function shutdown(): Promise<void> {
  await server.stop();
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
