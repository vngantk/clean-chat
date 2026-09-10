import { createHttpClient } from "@clean-chat/client";
import type { AppEvent } from "@clean-chat/core";
import { createServer } from "@clean-chat/infrastructure";
import { afterEach, describe, expect, it } from "vitest";

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 1000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error("timed out");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("createHttpClient", () => {
  let server: ReturnType<typeof createServer> | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  async function connect() {
    server = createServer({ port: 0 });
    await server.start();
    return createHttpClient({
      baseUrl: `http://${server.host}:${String(server.port)}`,
    });
  }

  it("exposes typed use cases over the composition-root HTTP routes", async () => {
    const client = await connect();

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

  it("forwards events on eventSubscriber", async () => {
    const client = await connect();
    await client.signUp.execute({
      email: "ada@example.com",
      password: "password1",
      name: "Ada",
    });

    const received: AppEvent[] = [];
    const unsubscribe = client.eventSubscriber.subscribe(
      "channel-list-changed",
      (event) => {
        received.push(event);
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    await client.ensureGeneralChannel.execute();
    await waitFor(() => received.length === 1);

    expect(received).toEqual([{ type: "channel-list-changed" }]);
    unsubscribe();
  });

  it("persists the bearer on tokenStore across client instances", async () => {
    server = createServer({ port: 0 });
    await server.start();
    const baseUrl = `http://${server.host}:${String(server.port)}`;
    let stored: string | undefined;
    const tokenStore = {
      get: () => stored,
      set: (token: string | undefined) => {
        stored = token;
      },
    };

    const first = createHttpClient({ baseUrl, tokenStore });
    const user = await first.signUp.execute({
      email: "ada@example.com",
      password: "password1",
      name: "Ada",
    });
    expect(stored).toEqual(expect.any(String));

    const second = createHttpClient({ baseUrl, tokenStore });
    await expect(second.getCurrentUser.execute()).resolves.toEqual(user);

    await second.signOut.execute();
    expect(stored).toBeUndefined();
    await expect(second.getCurrentUser.execute()).resolves.toBeNull();
  });

  it("clears the local bearer even if sign-out fails", async () => {
    server = createServer({ port: 0 });
    await server.start();
    const baseUrl = `http://${server.host}:${String(server.port)}`;
    let stored: string | undefined;
    const tokenStore = {
      get: () => stored,
      set: (token: string | undefined) => {
        stored = token;
      },
    };
    const client = createHttpClient({ baseUrl, tokenStore });
    await client.signUp.execute({
      email: "ada@example.com",
      password: "password1",
      name: "Ada",
    });
    expect(stored).toEqual(expect.any(String));
    await server.stop();
    server = undefined;
    await expect(client.signOut.execute()).rejects.toThrow();
    expect(stored).toBeUndefined();
  });
});
