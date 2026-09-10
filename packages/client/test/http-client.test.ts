import { createHttpClient } from "@clean-chat/client";
import type { AppEvent } from "@clean-chat/core";
import { createBackend, type Backend } from "@clean-chat/infrastructure";
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
  let backend: Backend | undefined;

  afterEach(async () => {
    await backend?.server.stop();
    backend = undefined;
  });

  async function connect() {
    backend = createBackend({ port: 0 });
    await backend.server.start();
    return createHttpClient({
      baseUrl: `http://${backend.server.getHost()}:${String(backend.server.getPort())}`,
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
});
