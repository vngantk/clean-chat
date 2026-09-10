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
    const origin = `http://127.0.0.1:${server.getPort()}`;

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
    expect(typeof server.getApp().use).toBe("function");
    expect(server.getServer()).toBeUndefined();
    await server.start();
    expect(server.isRunning()).toBe(true);

    const firstPort = server.getPort();
    const firstApp = server.getApp();
    const firstHttp = server.getServer();
    expect(firstHttp?.listening).toBe(true);
    expect(firstHttp?.address()).toMatchObject({ port: firstPort });
    expect(firstApp).toBe(server.getApp());
    const res = await fetch(`http://127.0.0.1:${firstPort}/ping`);
    expect(res.status).toBe(204);

    await server.stop();
    expect(server.isRunning()).toBe(false);
    expect(() => server.getPort()).toThrow(/not running/);
    expect(server.getApp()).toBe(firstApp);
    expect(server.getServer()).toBeUndefined();

    await expect(
      fetch(`http://127.0.0.1:${firstPort}/ping`),
    ).rejects.toThrow();

    await server.start();
    expect(server.isRunning()).toBe(true);
    expect(server.getApp()).toBe(firstApp);
    expect(server.getServer()).not.toBe(firstHttp);
    const again = await fetch(
      `http://127.0.0.1:${server.getPort()}/ping`,
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
    expect(server.getHost()).toBe("127.0.0.1");
    await server.stop();

    server = createExpressServer({
      routers: { "/": pingRouter() },
      port: 0,
      host: "localhost",
    });
    expect(server.getHost()).toBe("localhost");
    await server.start();
    expect(server.getHost()).toBe("localhost");
  });
});
