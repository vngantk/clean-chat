import {
  createExpressServer,
  createExpressUseCaseRouter,
  type ExpressServer,
  type HttpUseCase,
} from "@clean-chat/infrastructure";
import { afterEach, describe, expect, it } from "vitest";
import { createHttpUseCase } from "@clean-chat/client";

function asUseCase(
  name: string,
  execute: (input: unknown) => Promise<unknown>,
): HttpUseCase {
  return { name, execute: execute as HttpUseCase["execute"] };
}

describe("createHttpUseCase", () => {
  let server: ExpressServer | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  async function origin(useCases: HttpUseCase[], mount = "/") {
    server = createExpressServer({
      routers: { [mount]: createExpressUseCaseRouter(useCases) },
      port: 0,
    });
    await server.start();
    const path = mount === "/" ? "" : mount;
    return `http://${server.host}:${String(server.port)}${path}`;
  }

  it("POSTs JSON Input and returns JSON Output", async () => {
    const bodies: unknown[] = [];
    const base = await origin([
      asUseCase("echo", async (input) => {
        bodies.push(input);
        return { echoed: input };
      }),
    ]);

    const echo = createHttpUseCase<{ n: number }, { echoed: { n: number } }>(
      "echo",
      `${base}/echo`,
    );
    await expect(echo.execute({ n: 1 })).resolves.toEqual({
      echoed: { n: 1 },
    });
    expect(echo.name).toBe("echo");
    expect(bodies).toEqual([{ n: 1 }]);
  });

  it("maps 204 to undefined for void Output", async () => {
    const base = await origin([asUseCase("ping", async () => undefined)]);

    const ping = createHttpUseCase<void, void>("ping", `${base}/ping`);
    await expect(ping.execute()).resolves.toBeUndefined();
  });

  it("throws when the server responds with an error status", async () => {
    const base = await origin([
      asUseCase("fail", async () => {
        throw new Error("nope");
      }),
    ]);

    const fail = createHttpUseCase<void, void>("fail", `${base}/fail`);
    await expect(fail.execute()).rejects.toThrow("Internal server error");
  });

  it("uses the mount prefix in the URL", async () => {
    const base = await origin(
      [asUseCase("ping", async () => undefined)],
      "/use-cases",
    );

    const ping = createHttpUseCase<void, void>("ping", `${base}/ping`);
    await expect(ping.execute()).resolves.toBeUndefined();
  });
});
