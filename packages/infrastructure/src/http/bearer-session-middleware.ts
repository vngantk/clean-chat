import type { RequestHandler } from "express";
import { runWithSessionContext } from "../memory/session-context.js";
import { parseBearerAuthorization } from "./bearer.js";

/**
 * Bind the request's `Authorization: Bearer` token for {@link AuthPort}
 * for the rest of the request (AsyncLocalStorage).
 */
export function createBearerSessionMiddleware(): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    const token = parseBearerAuthorization(
      typeof header === "string" ? header : undefined,
    );
    runWithSessionContext(token, () => {
      next();
    });
  };
}
