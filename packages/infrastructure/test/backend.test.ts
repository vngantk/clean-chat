import { createHttpClient } from "@clean-chat/client";
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
});
