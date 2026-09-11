import { existsSync } from "node:fs";
import { type Server } from "node:http";
import path from "node:path";
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
 * loopback when no SPA is served) allows any `Origin`. An empty list
 * disables CORS headers (same-origin only; the default when serving a
 * SPA). Off-loopback binds without a SPA require an explicit allowlist.
 */
export type CorsOrigins = "*" | readonly string[];

export type ExpressServerDeps = {
  routers: Record<string, Router>;
  port: number;
  host?: string;
  /**
   * CORS allowlist. Default `"*"` on loopback when no SPA is served.
   * Serving {@link staticDir} defaults to `[]` (same-origin). Cookie
   * credentials are not used; the UI sends `Authorization: Bearer`.
   * Binding off loopback with `"*"` throws.
   */
  corsOrigins?: CorsOrigins;
  /** Ran after CORS and before routers (e.g. bearer session context). */
  middleware?: readonly RequestHandler[];
  /**
   * Built SPA directory (Vite `dist`). Served after API routers so
   * `GET /` is the UI on the same origin as `/use-cases` and `/events`.
   * Missing files without an extension fall back to `index.html`.
   * When set and {@link corsOrigins} is omitted, CORS is same-origin
   * (`[]`) so the process can bind off loopback without `CORS_ORIGIN`.
   */
  staticDir?: string;
};

/**
 * Express HTTP server.
 *
 * The Express app is created immediately and routers are mounted once.
 * {@link Lifecycle.start} only listens. `port` is useful when the listen
 * port was `0` (throws if not running). `host` is the bind address
 * (`127.0.0.1` when omitted). `app` is always the same Express
 * application. `server` is the `http.Server` from `app.listen()`, or
 * `undefined` when it has not been started (or after `stop`).
 */
export type ExpressServer = Lifecycle & {
  readonly port: number;
  readonly host: string;
  readonly app: Express;
  readonly server: Server | undefined;
};

/**
 * Builds an Express app, applies security headers and CORS, mounts each
 * router at its map key (`app.use(path, router)`), optionally serves a
 * built SPA from {@link ExpressServerDeps.staticDir}, and listens on
 * `port` / `host` in {@link Lifecycle.start}.
 */
export function createExpressServer(deps: ExpressServerDeps): ExpressServer {
  const host = deps.host ?? "127.0.0.1";
  const corsOrigins =
    deps.corsOrigins ?? (deps.staticDir === undefined ? undefined : []);
  assertCorsForHost(host, corsOrigins);
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
      origin: corsOrigin(corsOrigins),
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
  for (const [mountPath, router] of Object.entries(deps.routers)) {
    app.use(mountPath === "" ? "/" : mountPath, router);
  }
  if (deps.staticDir !== undefined) {
    mountSpaStatic(app, deps.staticDir, Object.keys(deps.routers));
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

    get port() {
      const addr = requireListening().address();
      if (addr === null || typeof addr === "string") {
        throw new Error("HTTP server has no TCP port");
      }
      return addr.port;
    },

    get host() {
      return host;
    },

    get app() {
      return app;
    },

    get server() {
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

/**
 * Serve hashed Vite assets from `dir`, then `index.html` for GET/HEAD
 * that are not API mounts and have no file extension.
 */
function mountSpaStatic(
  app: Express,
  dir: string,
  routerPaths: readonly string[],
): void {
  const resolved = path.resolve(dir);
  const indexHtml = path.join(resolved, "index.html");
  if (!existsSync(indexHtml)) {
    throw new Error(`SPA index.html not found: ${indexHtml}`);
  }
  const apiPrefixes = routerPaths
    .map((mount) => (mount === "" ? "/" : mount))
    .filter((mount) => mount !== "/");

  app.use(express.static(resolved));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (apiPrefixes.some((prefix) => isUnderPrefix(req.path, prefix))) {
      next();
      return;
    }
    if (path.extname(req.path) !== "") {
      next();
      return;
    }
    res.sendFile(indexHtml, (err) => {
      if (err) {
        next(err);
      }
    });
  });
}

function isUnderPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
