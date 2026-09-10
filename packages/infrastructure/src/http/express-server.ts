import { type Server } from "node:http";
import express, { type Express, type Router } from "express";
import type { Lifecycle } from "./lifecycle.js";

export type ExpressServerDeps = {
  routers: Record<string, Router>;
  port: number;
  host?: string;
};

/**
 * Express HTTP server.
 *
 * The Express app is created immediately and routers are mounted once.
 * {@link Lifecycle.start} only listens. `getPort` is useful when `port`
 * was `0`. `getHost` is the bind address (`127.0.0.1` when `host` was
 * omitted). `getApp` is always the same application. `getServer` returns
 * the `http.Server` from `app.listen()`, or `undefined` when it has not
 * been started (or after `stop`).
 */
export type ExpressServer = Lifecycle & {
  getPort(): number;
  getHost(): string;
  getApp(): Express;
  getServer(): Server | undefined;
};

/**
 * Builds an Express app, mounts each router at its map key
 * (`app.use(path, router)`), and listens on `port` / `host` in
 * {@link Lifecycle.start}.
 */
export function createExpressServer(deps: ExpressServerDeps): ExpressServer {
  const host = deps.host ?? "127.0.0.1";
  const app = express();
  for (const [path, router] of Object.entries(deps.routers)) {
    app.use(path === "" ? "/" : path, router);
  }
  let httpServer: Server | undefined;

  function requireListening(): Server {
    if (!httpServer?.listening) {
      throw new Error("HTTP server is not running");
    }
    return httpServer;
  }

  return {
    async start() {
      if (httpServer?.listening) {
        throw new Error("HTTP server is already running");
      }

      await new Promise<void>((resolve, reject) => {
        const onError = (err: Error) => {
          httpServer = undefined;
          reject(err);
        };
        const listening = app.listen(deps.port, host, () => {
          listening.off("error", onError);
          resolve();
        });
        listening.once("error", onError);
        httpServer = listening;
      });
    },

    async stop() {
      const current = httpServer;
      if (!current) {
        return;
      }
      httpServer = undefined;
      await new Promise<void>((resolve, reject) => {
        current.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
        current.closeAllConnections();
      });
    },

    isRunning() {
      return httpServer?.listening === true;
    },

    getPort() {
      const addr = requireListening().address();
      if (addr === null || typeof addr === "string") {
        throw new Error("HTTP server has no TCP port");
      }
      return addr.port;
    },

    getHost() {
      return host;
    },

    getApp() {
      return app;
    },

    getServer() {
      return httpServer;
    },
  };
}
