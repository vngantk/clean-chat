import { createHttpClient } from "@clean-chat/client";
import { SignUpName } from "@clean-chat/core/use-cases";
import { afterEach, describe, expect, it } from "vitest";
import { createBackend, type Backend } from "../src/backend.js";

describe("createBackend", () => {
  let backend: Backend | undefined;

  afterEach(async () => {
    await backend?.server.stop();
    backend = undefined;
  });

  it("wires auth and channels over HTTP", async () => {
    backend = createBackend({ port: 0 });
    await backend.server.start();
    const client = createHttpClient({
      baseUrl: `http://${backend.server.getHost()}:${String(backend.server.getPort())}`,
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
      baseUrl: `http://${backend.server.getHost()}:${String(backend.server.getPort())}`,
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
    backend = createBackend({ port: 0 });
    await backend.server.start();
    const client = createHttpClient({
      baseUrl: `http://${backend.server.getHost()}:${String(backend.server.getPort())}`,
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
        baseUrl: `http://${backend.server.getHost()}:${String(backend.server.getPort())}`,
      }).sendMessage.execute({ channelId: "ch-1", body: "hi" }),
    ).rejects.toThrow("Not authenticated");
  });

  it("rejects unauthenticated SSE and caps streams per token", async () => {
    backend = createBackend({ port: 0, sseMaxConnectionsPerToken: 1 });
    await backend.server.start();
    const base = `http://${backend.server.getHost()}:${String(backend.server.getPort())}`;

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
    backend = createBackend({
      port: 0,
      authRateLimit: { max: 2, windowMs: 60_000 },
    });
    await backend.server.start();
    const clientBase = `http://${backend.server.getHost()}:${String(backend.server.getPort())}`;
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
});
