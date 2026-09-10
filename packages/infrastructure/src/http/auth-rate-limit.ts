import type { RequestHandler } from "express";
import { sendHttpError } from "./http-error-handler.js";
import { TOO_MANY_REQUESTS_ERROR } from "./http-errors.js";

/** Defaults: 10 `sign-in` / `sign-up` attempts per IP per 15 minutes. */
export type AuthRateLimitOptions = {
  windowMs?: number;
  max?: number;
};

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX = 10;

/**
 * In-memory limiter for scrypt-heavy auth routes. Keyed by client address.
 */
export function createAuthRateLimiter(
  options: AuthRateLimitOptions = {},
): RequestHandler {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const max = options.max ?? DEFAULT_MAX;
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    const current = hits.get(key);
    if (current === undefined || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (current.count >= max) {
      sendHttpError(res, 429, TOO_MANY_REQUESTS_ERROR);
      return;
    }
    current.count += 1;
    next();
  };
}
