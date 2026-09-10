import { type Server } from "node:http";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import {
  createExpressUseCaseRouter,
  type ExpressUseCaseRouterOptions,
  type HttpUseCase,
} from "../src/http/index.js";

function asUseCase(
  name: string,
  execute: (input: unknown) => Promise<unknown>,
): HttpUseCase {
  return { name, execute: execute as HttpUseCase["execute"] };
}

async function listen(
  app: express.Express,
): Promise<{ origin: string; close: () => Promise<void> }> {
  const server: Server = await new Promise((resolve, reject) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    listening.once("error", reject);
  });
  const addr = server.address();
  if (addr === null || typeof addr === "string") {
    throw new Error("expected a TCP port");
  }
  return {
    origin: `http://127.0.0.1:${addr.port}`,
    close() {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
        server.closeAllConnections();
      });
    },
  };
}

describe("createExpressUseCaseRouter", () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  async function mount(
    useCases: HttpUseCase[],
    mountPath?: string,
    routerOptions?: ExpressUseCaseRouterOptions,
  ) {
    const app = express();
    const router = createExpressUseCaseRouter(useCases, routerOptions);
    if (mountPath !== undefined) {
      app.use(mountPath, router);
    } else {
      app.use(router);
    }
    const listening = await listen(app);
    close = listening.close;
    return listening.origin;
  }

  it("POSTs JSON to the named use case and returns JSON output", async () => {
    const bodies: unknown[] = [];
    const origin = await mount([
      asUseCase("echo", async (input) => {
        bodies.push(input);
        return { echoed: input };
      }),
    ]);

    const res = await fetch(`${origin}/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ n: 1 }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ echoed: { n: 1 } });
    expect(bodies).toEqual([{ n: 1 }]);
  });

  it("responds 204 when the use case returns undefined", async () => {
    const origin = await mount([asUseCase("ping", async () => undefined)]);

    const res = await fetch(`${origin}/ping`, { method: "POST" });

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });

  it("responds 500 with a generic body when the use case throws", async () => {
    const origin = await mount([
      asUseCase("fail", async () => {
        throw new Error("nope");
      }),
    ]);

    const res = await fetch(`${origin}/fail`, { method: "POST" });
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Internal server error",
    });
  });

  it("maps known domain errors to 400 and keeps the message", async () => {
    const origin = await mount([
      asUseCase("fail", async () => {
        throw new Error("Invalid input");
      }),
    ]);

    const res = await fetch(`${origin}/fail`, { method: "POST" });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid input" });
  });

  it("responds 400 for invalid JSON", async () => {
    const origin = await mount([asUseCase("echo", async (input) => input)]);

    const res = await fetch(`${origin}/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON" });
  });

  it("responds 413 when the JSON body exceeds the limit", async () => {
    const origin = await mount(
      [asUseCase("echo", async (input) => input)],
      undefined,
      { jsonBodyLimit: "50b" },
    );

    const res = await fetch(`${origin}/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ n: "x".repeat(200) }),
    });
    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({ error: "Payload too large" });
  });

  it("responds 404 for an unknown path or GET", async () => {
    const origin = await mount([asUseCase("echo", async (input) => input)]);

    const missing = await fetch(`${origin}/other`, { method: "POST" });
    const get = await fetch(`${origin}/echo`, { method: "GET" });

    expect(missing.status).toBe(404);
    expect(get.status).toBe(404);
  });

  it("registers a route per use-case name", async () => {
    const origin = await mount([
      asUseCase("a", async () => "A"),
      asUseCase("b", async () => "B"),
    ]);

    const a = await fetch(`${origin}/a`, { method: "POST" });
    const b = await fetch(`${origin}/b`, { method: "POST" });

    expect(await a.text()).toBe(JSON.stringify("A"));
    expect(await b.text()).toBe(JSON.stringify("B"));
  });

  it("can be mounted at a path prefix", async () => {
    const origin = await mount(
      [asUseCase("ping", async () => undefined)],
      "/api",
    );

    const prefixed = await fetch(`${origin}/api/ping`, { method: "POST" });
    const root = await fetch(`${origin}/ping`, { method: "POST" });

    expect(prefixed.status).toBe(204);
    expect(root.status).toBe(404);
  });

  it("throws when two use cases share a name", () => {
    expect(() =>
      createExpressUseCaseRouter([
        asUseCase("echo", async () => undefined),
        asUseCase("echo", async () => undefined),
      ]),
    ).toThrow(/Duplicate use case name/);
  });
});
