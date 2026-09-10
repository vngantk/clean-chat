import express, { type Router } from "express";
import { getIssuedToken } from "../memory/session-context.js";
import {
  createAuthRateLimiter,
  type AuthRateLimitOptions,
} from "./auth-rate-limit.js";
import { bearerAuthorizationHeader } from "./bearer.js";
import { httpErrorHandler } from "./http-error-handler.js";
import { JSON_BODY_LIMIT } from "./http-errors.js";

/**
 * A use case invokable from HTTP. Input is typed as `never` so a map can hold
 * `UseCase<I, O>` values with different `I` without `any`. The handler casts
 * the JSON body when calling `execute`.
 */
export type HttpUseCase = {
  execute(input: never): Promise<unknown>;
};

export type ExpressUseCaseRouterOptions = {
  /** Passed to `express.json`. Default {@link JSON_BODY_LIMIT}. */
  jsonBodyLimit?: string;
  /** Applied only to `sign-in` and `sign-up`. */
  authRateLimit?: AuthRateLimitOptions;
};

/**
 * Express `Router` with `POST /{useCaseName}` for each entry in `useCases`.
 * Mount it on an app (`app.use(router)` or `app.use("/api", router)`).
 *
 * JSON body is Input; JSON body is Output. `void` Output is **204 No Content**
 * so the client can tell there is no payload. This is not a public REST API.
 */
export function createExpressUseCaseRouter(
  useCases: Record<string, HttpUseCase>,
  options?: ExpressUseCaseRouterOptions,
): Router {
  const router = express.Router();
  router.use(express.json({ limit: options?.jsonBodyLimit ?? JSON_BODY_LIMIT }));
  const authLimiter = createAuthRateLimiter(options?.authRateLimit);

  for (const [name, useCase] of Object.entries(useCases)) {
    const rateLimited = name === "sign-in" || name === "sign-up";
    router.post(
      `/${name}`,
      ...(rateLimited ? [authLimiter] : []),
      async (req, res, next) => {
        try {
          const output = await useCase.execute(req.body as never);
          const issued = getIssuedToken();
          if (issued !== null) {
            res.setHeader("Authorization", bearerAuthorizationHeader(issued));
          }
          if (output === undefined) {
            res.status(204).end();
            return;
          }
          res.json(output);
        } catch (err) {
          next(err);
        }
      },
    );
  }

  router.use(httpErrorHandler);
  return router;
}
