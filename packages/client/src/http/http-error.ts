/**
 * Server `{ error }` string for a missing or revoked bearer session.
 * Kept here so the client package does not import `@clean-chat/application`.
 */
export const NOT_AUTHENTICATED_ERROR = "Not authenticated";

/**
 * HTTP failure with a status code. Use-case POSTs and SSE connect throw this
 * so callers can distinguish 401 from a network error.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/** True when the server rejected the bearer (`Not authenticated` / SSE 401). */
export function isNotAuthenticatedError(err: unknown): boolean {
  if (err instanceof HttpError) {
    return (
      err.status === 401 && err.message === NOT_AUTHENTICATED_ERROR
    );
  }
  return err instanceof Error && err.message === NOT_AUTHENTICATED_ERROR;
}

/** True when SSE must stop reconnecting (401 or 403). */
export function isSseAuthFailure(err: unknown): boolean {
  if (err instanceof HttpError) {
    return err.status === 401 || err.status === 403;
  }
  return false;
}

/**
 * Read `{ error }` from a failed HTTP response, or `HTTP {status}` when
 * the body is not that shape.
 */
export async function readHttpErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string" &&
      body.error.length > 0
    ) {
      return body.error;
    }
  } catch {
    // Non-JSON error body.
  }
  return `HTTP ${String(response.status)}`;
}

/** Throw {@link HttpError} with the server `{ error }` string. */
export async function throwHttpError(response: Response): Promise<never> {
  throw new HttpError(response.status, await readHttpErrorMessage(response));
}
