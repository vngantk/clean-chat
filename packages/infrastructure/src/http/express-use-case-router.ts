import express, { type Router } from "express";
import { getIssuedToken } from "../memory/session-context.js";
import { bearerAuthorizationHeader } from "./bearer.js";

/**
 * A use case invokable from HTTP. Input is typed as `never` so a map can hold
 * `UseCase<I, O>` values with different `I` without `any`. The handler casts
 * the JSON body when calling `execute`.
 */
export type HttpUseCase = {
  execute(input: never): Promise<unknown>;
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
): Router {
  const router = express.Router();
  router.use(express.json());

  for (const [name, useCase] of Object.entries(useCases)) {
    router.post(`/${name}`, async (req, res, next) => {
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
    });
  }

  return router;
}
