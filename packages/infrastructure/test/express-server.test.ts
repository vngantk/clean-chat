import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { createExpressServer, type ExpressServer } from "../src/http/index.js";

function pingRouter() {
  const router = express.Router();
  router.get("/ping", (_req, res) => {
    res.status(204).end();
  });
  return router;
}

function echoRouter() {
  const router = express.Router();
  router.get("/echo", (req, res) => {
    res.json({ q: req.query.q ?? null });
  });
  return router;
}

describe("createExpressServer", () => {
  let server: ExpressServer | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  it("mounts each router at its path and serves requests", async () => {
    server = createExpressServer({
      routers: {
        "/api": pingRouter(),
        "/other": echoRouter(),
      },
      port: 0,
    });
    await server.start();
    const origin = `http://127.0.0.1:${server.port}`;

    const ping = await fetch(`${origin}/api/ping`);
    const echo = await fetch(`${origin}/other/echo?q=hi`);
    const missing = await fetch(`${origin}/api/echo`);

    expect(ping.status).toBe(204);
    expect(echo.status).toBe(200);
    await expect(echo.json()).resolves.toEqual({ q: "hi" });
    expect(missing.status).toBe(404);
  });

  it("tracks running state and can start again after stop", async () => {
    server = createExpressServer({
      routers: { "/": pingRouter() },
      port: 0,
    });

    expect(server.isRunning()).toBe(false);
    expect(typeof server.app.use).toBe("function");
    expect(server.server).toBeUndefined();
    await server.start();
    expect(server.isRunning()).toBe(true);

    const firstPort = server.port;
    const firstApp = server.app;
    const firstHttp = server.server;
    expect(firstHttp?.listening).toBe(true);
    expect(firstHttp?.address()).toMatchObject({ port: firstPort });
    expect(firstApp).toBe(server.app);
    const res = await fetch(`http://127.0.0.1:${firstPort}/ping`);
    expect(res.status).toBe(204);

    await server.stop();
    expect(server.isRunning()).toBe(false);
    expect(() => server.port).toThrow(/not running/);
    expect(server.app).toBe(firstApp);
    expect(server.server).toBeUndefined();

    await expect(
      fetch(`http://127.0.0.1:${firstPort}/ping`),
    ).rejects.toThrow();

    await server.start();
    expect(server.isRunning()).toBe(true);
    expect(server.app).toBe(firstApp);
    expect(server.server).not.toBe(firstHttp);
    const again = await fetch(
      `http://127.0.0.1:${server.port}/ping`,
    );
    expect(again.status).toBe(204);
  });

  it("throws if start is called while running", async () => {
    server = createExpressServer({
      routers: { "/": pingRouter() },
      port: 0,
    });
    await server.start();

    await expect(server.start()).rejects.toThrow(/already running/);
  });

  it("stop is a no-op when not running", async () => {
    server = createExpressServer({
      routers: {},
      port: 0,
    });

    await expect(server.stop()).resolves.toBeUndefined();
    expect(server.isRunning()).toBe(false);
  });

  it("returns the bind host, defaulting to 127.0.0.1", async () => {
    server = createExpressServer({
      routers: { "/": pingRouter() },
      port: 0,
    });
    expect(server.host).toBe("127.0.0.1");
    await server.stop();

    server = createExpressServer({
      routers: { "/": pingRouter() },
      port: 0,
      host: "localhost",
    });
    expect(server.host).toBe("localhost");
    await server.start();
    expect(server.host).toBe("localhost");
  });

  it("allows cross-origin preflight and POST by default", async () => {
    server = createExpressServer({
      routers: { "/": pingRouter() },
      port: 0,
    });
    await server.start();
    const url = `http://127.0.0.1:${String(server.port)}/ping`;
    const origin = "http://localhost:5173";

    const preflight = await fetch(url, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
    expect(preflight.headers.get("access-control-allow-methods")).toMatch(
      /POST/,
    );
    expect(preflight.headers.get("access-control-allow-headers")).toMatch(
      /content-type/i,
    );
    expect(preflight.headers.get("access-control-allow-headers")).toMatch(
      /authorization/i,
    );

    const get = await fetch(url, { headers: { Origin: origin } });
    expect(get.status).toBe(204);
    expect(get.headers.get("access-control-allow-origin")).toBe("*");
    expect(get.headers.get("x-content-type-options")).toBe("nosniff");
    expect(get.headers.get("x-frame-options")).toBe("DENY");
    expect(get.headers.get("x-powered-by")).toBeNull();
  });

  it("reflects only allowlisted origins", async () => {
    const allowed = "http://ui.example";
    server = createExpressServer({
      routers: { "/": pingRouter() },
      port: 0,
      corsOrigins: [allowed],
    });
    await server.start();
    const url = `http://127.0.0.1:${String(server.port)}/ping`;

    const ok = await fetch(url, { headers: { Origin: allowed } });
    expect(ok.headers.get("access-control-allow-origin")).toBe(allowed);

    const denied = await fetch(url, {
      headers: { Origin: "http://evil.example" },
    });
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("omits CORS headers when the allowlist is empty", async () => {
    server = createExpressServer({
      routers: { "/": pingRouter() },
      port: 0,
      corsOrigins: [],
    });
    await server.start();
    const url = `http://127.0.0.1:${String(server.port)}/ping`;
    const res = await fetch(url, {
      headers: { Origin: "http://localhost:5173" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rejects * CORS when binding off loopback", () => {
    expect(() =>
      createExpressServer({
        routers: {},
        port: 0,
        host: "0.0.0.0",
      }),
    ).toThrow(/explicit allowlist/);

    expect(() =>
      createExpressServer({
        routers: {},
        port: 0,
        host: "0.0.0.0",
        corsOrigins: ["http://ui.example"],
      }),
    ).not.toThrow();
  });
});
