#!/usr/bin/env node

import { createBackend } from "./backend.js";

const port = parsePort(process.env["PORT"]);
const host = process.env["HOST"] ?? "127.0.0.1";
const { server } = createBackend({ port, host });

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
