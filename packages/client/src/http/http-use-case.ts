import type { UseCase } from "@clean-chat/core/use-cases";
import { parseBearerAuthorization } from "./bearer.js";
import { readHttpErrorMessage } from "./http-error.js";

export type HttpUseCaseOptions = {
  /** Extra request headers (e.g. `Authorization`). */
  getHeaders?: () => Record<string, string>;
  /** Called on every completed response (used to capture a new bearer token). */
  onResponse?: (response: Response) => void;
};

/**
 * Driving adapter: `POST` JSON `Input` to `url`, return JSON `Output`.
 * Uses platform `fetch` (Node 20+ and browsers). Server `void` Output is
 * **204**; this adapter yields `undefined`. Non-OK responses throw with
 * the server `{ error }` string (or `HTTP {status}` if the body is not
 * that shape).
 */
export function createHttpUseCase<Input, Output>(
  url: string,
  options?: HttpUseCaseOptions,
): UseCase<Input, Output> {
  return {
    async execute(input) {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        ...options?.getHeaders?.(),
      };
      const res =
        input === undefined
          ? await fetch(url, { method: "POST", headers })
          : await fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(input),
            });
      options?.onResponse?.(res);
      if (res.status === 204) {
        return undefined as Output;
      }
      if (!res.ok) {
        throw new Error(await readHttpErrorMessage(res));
      }
      return (await res.json()) as Output;
    },
  };
}

/** Capture `Authorization: Bearer` from a response, if present. */
export function readIssuedBearerToken(response: Response): string | null {
  return parseBearerAuthorization(response.headers.get("authorization"));
}
