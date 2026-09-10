import type { UseCase } from "@clean-chat/contracts/use-cases";

/**
 * Driving adapter: `POST` JSON `Input` to `url`, return JSON `Output`.
 * Server `void` Output is **204**; this adapter yields `undefined`.
 * Non-OK responses throw (Express default 500 is not a domain error body).
 */
export function createHttpUseCase<Input, Output>(
  url: string,
): UseCase<Input, Output> {
  return {
    async execute(input) {
      const headers = { "content-type": "application/json" };
      const res =
        input === undefined
          ? await fetch(url, { method: "POST", headers })
          : await fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(input),
            });
      if (res.status === 204) {
        return undefined as Output;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${String(res.status)}`);
      }
      return (await res.json()) as Output;
    },
  };
}
