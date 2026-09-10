import { afterEach, describe, expect, it } from "vitest";
import {
  createExpressServer,
  createExpressUseCaseRouter,
  createHttpUseCase,
  type ExpressServer,
  type HttpUseCase,
} from "../src/http/index.js";

function asUseCase(
  execute: (input: unknown) => Promise<unknown>,
): HttpUseCase {
  return { execute: execute as HttpUseCase["execute"] };
}

describe("createHttpUseCase", () => {
  let server: ExpressServer | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  async function origin(useCases: Record<string, HttpUseCase>, mount = "/") {
    server = createExpressServer({
      routers: { [mount]: createExpressUseCaseRouter(useCases) },
      port: 0,
    });
    await server.start();
    const path = mount === "/" ? "" : mount;
    return `http://${server.getHost()}:${String(server.getPort())}${path}`;
  }

  it("POSTs JSON Input and returns JSON Output", async () => {
    const bodies: unknown[] = [];
    const base = await origin({
      echo: asUseCase(async (input) => {
        bodies.push(input);
        return { echoed: input };
      }),
    });

    const echo = createHttpUseCase<{ n: number }, { echoed: { n: number } }>(
      `${base}/echo`,
    );
    await expect(echo.execute({ n: 1 })).resolves.toEqual({
      echoed: { n: 1 },
    });
    expect(bodies).toEqual([{ n: 1 }]);
  });

  it("maps 204 to undefined for void Output", async () => {
    const base = await origin({
      ping: asUseCase(async () => undefined),
    });

    const ping = createHttpUseCase<void, void>(`${base}/ping`);
    await expect(ping.execute()).resolves.toBeUndefined();
  });

  it("throws when the server responds with an error status", async () => {
    const base = await origin({
      fail: asUseCase(async () => {
        throw new Error("nope");
      }),
    });

    const fail = createHttpUseCase<void, void>(`${base}/fail`);
    await expect(fail.execute()).rejects.toThrow(/HTTP 500/);
  });

  it("uses the mount prefix in the URL", async () => {
    const base = await origin(
      { ping: asUseCase(async () => undefined) },
      "/use-cases",
    );

    const ping = createHttpUseCase<void, void>(`${base}/ping`);
    await expect(ping.execute()).resolves.toBeUndefined();
  });
});
