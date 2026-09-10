import { type Server } from "node:http";
import cors from "cors";
import express, {
  type Express,
  type RequestHandler,
  type Router,
} from "express";
import { httpErrorHandler } from "./http-error-handler.js";
import type { Lifecycle } from "./lifecycle.js";

/**
 * Browser origins allowed to call this server. `"*"` (the default on
 * loopback) allows any `Origin`. An empty list disables CORS headers
 * (same-origin only). Off-loopback binds require an explicit allowlist.
 */
export type CorsOrigins = "*" | readonly string[];

export type ExpressServerDeps = {
  routers: Record<string, Router>;
  port: number;
  host?: string;
  /**
   * CORS allowlist. Default `"*"` on loopback. Restrict to the UI
   * origin(s) when they are known. Cookie credentials are not used; the
   * UI sends `Authorization: Bearer`. Binding off loopback with `"*"`
   * throws.
   */
  corsOrigins?: CorsOrigins;
  /** Ran after CORS and before routers (e.g. bearer session context). */
  middleware?: readonly RequestHandler[];
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
 * Builds an Express app, applies security headers and CORS, mounts each
 * router at its map key (`app.use(path, router)`), and listens on `port`
 * / `host` in {@link Lifecycle.start}.
 */
export function createExpressServer(deps: ExpressServerDeps): ExpressServer {
  const host = deps.host ?? "127.0.0.1";
  assertCorsForHost(host, deps.corsOrigins);
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    next();
  });
  app.use(
    cors({
      origin: corsOrigin(deps.corsOrigins),
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["Authorization"],
      optionsSuccessStatus: 204,
      maxAge: 600,
    }),
  );
  for (const handler of deps.middleware ?? []) {
    app.use(handler);
  }
  for (const [path, router] of Object.entries(deps.routers)) {
    app.use(path === "" ? "/" : path, router);
  }
  app.use(httpErrorHandler);
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

function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

function assertCorsForHost(
  host: string,
  origins: CorsOrigins | undefined,
): void {
  if (isLoopbackHost(host)) {
    return;
  }
  if (origins === undefined || origins === "*") {
    throw new Error(
      "CORS_ORIGIN must be an explicit allowlist when binding off loopback",
    );
  }
}

function corsOrigin(
  origins: CorsOrigins | undefined,
): boolean | string | string[] {
  if (origins === undefined || origins === "*") {
    return "*";
  }
  if (origins.length === 0) {
    return false;
  }
  return [...origins];
}
