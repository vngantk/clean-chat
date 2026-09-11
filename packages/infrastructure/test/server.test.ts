import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHttpClient } from "@clean-chat/client";
import { SignUpName } from "@clean-chat/core/use-cases";
import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";

describe("createServer", () => {
  let server: ReturnType<typeof createServer> | undefined;
  const spaDirs: string[] = [];

  afterEach(async () => {
    await server?.stop();
    server = undefined;
    for (const dir of spaDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("wires auth and channels over HTTP", async () => {
    server = createServer({ port: 0 });
    await server.start();
    const client = createHttpClient({
      baseUrl: `http://${server.host}:${String(server.port)}`,
    });

    const user = await client.signUp.execute({
      email: "ada@example.com",
      password: "password1",
      name: "Ada",
    });
    expect(user).toMatchObject({
      email: "ada@example.com",
      name: "Ada",
    });
    await expect(client.getCurrentUser.execute()).resolves.toEqual(user);

    const other = createHttpClient({
      baseUrl: `http://${server.host}:${String(server.port)}`,
    });
    const grace = await other.signUp.execute({
      email: "grace@example.com",
      password: "password1",
      name: "Grace",
    });
    await expect(client.getCurrentUser.execute()).resolves.toEqual(user);
    await expect(other.getCurrentUser.execute()).resolves.toEqual(grace);

    await expect(
      client.signUp.execute({
        email: "bad@example.com",
        password: "short",
        name: "Bad",
      }),
    ).rejects.toThrow("Invalid input");

    const generalId = await client.ensureGeneralChannel.execute();
    const channels = await client.listChannels.execute();
    expect(channels).toEqual([
      {
        id: generalId,
        name: "general",
        createdBy: user.id,
      },
    ]);
  });

  it("maps auth failures to 401 and does not leak stacks", async () => {
    server = createServer({ port: 0 });
    await server.start();
    const client = createHttpClient({
      baseUrl: `http://${server.host}:${String(server.port)}`,
    });
    await client.signUp.execute({
      email: "ada@example.com",
      password: "password1",
      name: "Ada",
    });
    await expect(
      client.signIn.execute({
        email: "ada@example.com",
        password: "wrong-password",
      }),
    ).rejects.toThrow("Invalid email or password.");
    await expect(
      createHttpClient({
        baseUrl: `http://${server.host}:${String(server.port)}`,
      }).sendMessage.execute({ channelId: "ch-1", body: "hi" }),
    ).rejects.toThrow("Not authenticated");
  });

  it("rejects unauthenticated SSE and caps streams per token", async () => {
    server = createServer({ port: 0, sseMaxConnectionsPerToken: 1 });
    await server.start();
    const base = `http://${server.host}:${String(server.port)}`;

    const anonymous = await fetch(`${base}/events/channel-list-changed`);
    expect(anonymous.status).toBe(401);
    await expect(anonymous.json()).resolves.toEqual({
      error: "Not authenticated",
    });

    const signUp = await fetch(`${base}/use-cases/${SignUpName}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "ada@example.com",
        password: "password1",
        name: "Ada",
      }),
    });
    const authorization = signUp.headers.get("authorization");
    expect(authorization).toMatch(/^Bearer /);

    const first = await fetch(`${base}/events/channel-list-changed`, {
      headers: { authorization: authorization ?? "" },
    });
    expect(first.status).toBe(200);
    const second = await fetch(`${base}/events/message-list-changed`, {
      headers: { authorization: authorization ?? "" },
    });
    expect(second.status).toBe(429);
    await expect(second.json()).resolves.toEqual({
      error: "Too many connections",
    });
    await first.body?.cancel();
  });

  it("rate-limits sign-up", async () => {
    server = createServer({
      port: 0,
      authRateLimit: { max: 2, windowMs: 60_000 },
    });
    await server.start();
    const clientBase = `http://${server.host}:${String(server.port)}`;
    const a = createHttpClient({ baseUrl: clientBase });
    const b = createHttpClient({ baseUrl: clientBase });
    const c = createHttpClient({ baseUrl: clientBase });

    await a.signUp.execute({
      email: "a@example.com",
      password: "password1",
      name: "A",
    });
    await b.signUp.execute({
      email: "b@example.com",
      password: "password1",
      name: "B",
    });
    await expect(
      c.signUp.execute({
        email: "c@example.com",
        password: "password1",
        name: "C",
      }),
    ).rejects.toThrow("Too many requests");
  });

  it("serves the SPA on the same origin as use cases", async () => {
    const staticDir = mkdtempSync(path.join(tmpdir(), "clean-chat-spa-"));
    spaDirs.push(staticDir);
    writeFileSync(
      path.join(staticDir, "index.html"),
      "<!doctype html><title>Clean Chat SPA</title>",
    );
    server = createServer({ port: 0, staticDir });
    await server.start();
    const origin = `http://${server.host}:${String(server.port)}`;

    const page = await fetch(`${origin}/`);
    expect(page.status).toBe(200);
    await expect(page.text()).resolves.toContain("Clean Chat SPA");

    const client = createHttpClient({ baseUrl: origin });
    const user = await client.signUp.execute({
      email: "ada@example.com",
      password: "password1",
      name: "Ada",
    });
    expect(user.email).toBe("ada@example.com");

    const useCaseGet = await fetch(`${origin}/use-cases/${SignUpName}`);
    expect(useCaseGet.status).toBe(404);
  });
});
