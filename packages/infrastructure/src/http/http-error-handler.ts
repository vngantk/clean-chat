import type { ErrorRequestHandler, Response } from "express";
import { mapHttpError } from "./http-errors.js";

/** Write `{ error }` JSON. Used by the error handler and 401/429 shortcuts. */
export function sendHttpError(
  res: Response,
  status: number,
  error: string,
): void {
  res.status(status).json({ error });
}

/**
 * Express error middleware: known errors keep their message; unexpected
 * failures are 500 without a stack in the body.
 */
export const httpErrorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  next,
) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const mapped = mapHttpError(err);
  sendHttpError(res, mapped.status, mapped.error);
};
