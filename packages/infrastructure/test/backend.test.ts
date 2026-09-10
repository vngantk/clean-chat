import { afterEach, describe, expect, it } from "vitest";
import { createHttpUseCase } from "../src/http/client/http-use-case.js";
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
    const origin = `http://${backend.server.getHost()}:${String(backend.server.getPort())}/use-cases`;

    const signUp = createHttpUseCase<
      { email: string; password: string; name: string },
      { id: string; email: string; name: string }
    >(`${origin}/sign-up`);
    const getCurrentUser = createHttpUseCase<
      void,
      { id: string; email: string; name: string } | null
    >(`${origin}/get-current-user`);
    const ensureGeneral = createHttpUseCase<void, string>(
      `${origin}/ensure-general-channel`,
    );
    const listChannels = createHttpUseCase<
      void,
      { id: string; name: string; createdBy: string }[]
    >(`${origin}/list-channels`);

    const user = await signUp.execute({
      email: "ada@example.com",
      password: "password1",
      name: "Ada",
    });
    expect(user).toMatchObject({
      email: "ada@example.com",
      name: "Ada",
    });
    await expect(getCurrentUser.execute()).resolves.toEqual(user);

    const generalId = await ensureGeneral.execute();
    const channels = await listChannels.execute();
    expect(channels).toEqual([
      {
        id: generalId,
        name: "general",
        createdBy: user.id,
      },
    ]);
  });
});
