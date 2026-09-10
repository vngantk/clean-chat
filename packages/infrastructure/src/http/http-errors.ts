import {
  DISPLAY_NAME_EMPTY_ERROR,
  INVALID_INPUT_ERROR,
  NOT_AUTHENTICATED_ERROR,
  PRESENCE_DISCONNECT_FORBIDDEN_ERROR,
} from "@clean-chat/application";
import {
  CHANNEL_NAME_LENGTH_ERROR,
  CHANNEL_NAME_PATTERN_ERROR,
  CHANNEL_NOT_FOUND_ERROR,
  MESSAGE_DELETE_FORBIDDEN_ERROR,
  MESSAGE_EMPTY_ERROR,
  MESSAGE_TOO_LONG_ERROR,
} from "@clean-chat/core/domain";
import {
  EMAIL_TAKEN_ERROR,
  INVALID_CREDENTIALS_ERROR,
} from "../memory/auth.js";

/** JSON `{ error }` for unexpected failures. Never includes a stack. */
export const INTERNAL_SERVER_ERROR = "Internal server error";

/** JSON parse failure from `express.json`. */
export const INVALID_JSON_ERROR = "Invalid JSON";

/** Body larger than {@link JSON_BODY_LIMIT}. */
export const PAYLOAD_TOO_LARGE_ERROR = "Payload too large";

/** Auth (`sign-in` / `sign-up`) rate limit. */
export const TOO_MANY_REQUESTS_ERROR = "Too many requests";

/** Concurrent SSE streams for one bearer token. */
export const TOO_MANY_CONNECTIONS_ERROR = "Too many connections";

/** Default `express.json` limit (messages are ≤ 2000 chars). */
export const JSON_BODY_LIMIT = "16kb";

const STATUS_BY_MESSAGE = new Map<string, number>([
  [NOT_AUTHENTICATED_ERROR, 401],
  [INVALID_CREDENTIALS_ERROR, 401],
  [MESSAGE_DELETE_FORBIDDEN_ERROR, 403],
  [PRESENCE_DISCONNECT_FORBIDDEN_ERROR, 403],
  [INVALID_INPUT_ERROR, 400],
  [DISPLAY_NAME_EMPTY_ERROR, 400],
  [EMAIL_TAKEN_ERROR, 400],
  [CHANNEL_NAME_LENGTH_ERROR, 400],
  [CHANNEL_NAME_PATTERN_ERROR, 400],
  [CHANNEL_NOT_FOUND_ERROR, 400],
  [MESSAGE_EMPTY_ERROR, 400],
  [MESSAGE_TOO_LONG_ERROR, 400],
]);

export type MappedHttpError = {
  status: number;
  error: string;
};

/**
 * Map a thrown value to an HTTP status and public `{ error }` string.
 * Known domain / validation messages keep their copy. Everything else is
 * 500 {@link INTERNAL_SERVER_ERROR} (no stack).
 */
export function mapHttpError(err: unknown): MappedHttpError {
  if (isPayloadTooLarge(err)) {
    return { status: 413, error: PAYLOAD_TOO_LARGE_ERROR };
  }
  if (isJsonSyntaxError(err)) {
    return { status: 400, error: INVALID_JSON_ERROR };
  }
  if (err instanceof Error) {
    const status = STATUS_BY_MESSAGE.get(err.message);
    if (status !== undefined) {
      return { status, error: err.message };
    }
  }
  return { status: 500, error: INTERNAL_SERVER_ERROR };
}

function isPayloadTooLarge(err: unknown): boolean {
  if (typeof err !== "object" || err === null) {
    return false;
  }
  const typed = err as { status?: unknown; type?: unknown };
  return typed.status === 413 || typed.type === "entity.too.large";
}

function isJsonSyntaxError(err: unknown): boolean {
  return err instanceof SyntaxError && "body" in err;
}
