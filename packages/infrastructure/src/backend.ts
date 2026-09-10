import {
  createClearTyping,
  createCreateChannel,
  createDeleteOwnMessage,
  createDisconnectPresence,
  createEnsureGeneralChannel,
  createGetCurrentUser,
  createHeartbeatPresence,
  createListChannels,
  createListMessages,
  createListPresence,
  createListTyping,
  createSendMessage,
  createSignIn,
  createSignOut,
  createSignUp,
  createTypeBoxInputValidator,
  createUpsertTyping,
  createValidatedUseCase,
  useCaseInputSchemas,
  type InputValidator,
} from "@clean-chat/application";
import type { AppEvent } from "@clean-chat/core";
import { createInMemoryAuth } from "./memory/auth.js";
import { createSystemClock } from "./memory/clock.js";
import { createInMemoryEventBus } from "./memory/event-bus.js";
import { createRandomIdGenerator } from "./memory/id-generator.js";
import { createInMemoryPersistence } from "./memory/index.js";
import { getRequestToken } from "./memory/session-context.js";
import {
  createExpressEventSubscriptionRouter,
  DEFAULT_SSE_MAX_CONNECTIONS_PER_TOKEN,
} from "./http/express-event-subscription-router.js";
import { createBearerSessionMiddleware } from "./http/bearer-session-middleware.js";
import {
  createExpressServer,
  type CorsOrigins,
  type ExpressServer,
} from "./http/express-server.js";
import {
  createExpressUseCaseRouter,
  type HttpUseCase,
} from "./http/express-use-case-router.js";
import type { AuthRateLimitOptions } from "./http/auth-rate-limit.js";

const APP_EVENT_TYPES: AppEvent["type"][] = [
  "channel-list-changed",
  "message-list-changed",
  "typing-changed",
  "presence-changed",
];

export type BackendOptions = {
  port?: number;
  host?: string;
  corsOrigins?: CorsOrigins;
  /** Defaults to {@link createTypeBoxInputValidator}. */
  validator?: InputValidator;
  /** `sign-in` / `sign-up` limiter. */
  authRateLimit?: AuthRateLimitOptions;
  /** Concurrent SSE streams per bearer token. Default 8. */
  sseMaxConnectionsPerToken?: number;
  /** `express.json` limit. Default `16kb`. */
  jsonBodyLimit?: string;
};

/**
 * Composition root: in-memory adapters, interactors, and Express routers.
 * Call {@link ExpressServer.start} to listen. Does not start by itself.
 */
export type Backend = {
  server: ExpressServer;
};

/**
 * Wire persistence, auth, events, use cases, and HTTP.
 * Default bind is `127.0.0.1:3000`. Use `port: 0` in tests.
 */
export function createBackend(options: BackendOptions = {}): Backend {
  const persistence = createInMemoryPersistence();
  const ids = createRandomIdGenerator();
  const clock = createSystemClock();
  const events = createInMemoryEventBus();
  const auth = createInMemoryAuth({ store: persistence.store, ids });
  const { uow, channels, messages, typing, presence } = persistence;
  const validator = options.validator ?? createTypeBoxInputValidator();

  const useCases = validateUseCases(validator, {
    "sign-up": createSignUp(auth),
    "sign-in": createSignIn(auth),
    "sign-out": createSignOut(auth),
    "get-current-user": createGetCurrentUser(auth),
    "list-channels": createListChannels({ auth, uow, channels }),
    "ensure-general-channel": createEnsureGeneralChannel({
      auth,
      uow,
      channels,
      ids,
      events,
    }),
    "create-channel": createCreateChannel({
      auth,
      uow,
      channels,
      ids,
      events,
    }),
    "list-messages": createListMessages({ auth, uow, messages }),
    "send-message": createSendMessage({
      auth,
      uow,
      channels,
      messages,
      clock,
      ids,
      events,
    }),
    "delete-own-message": createDeleteOwnMessage({
      auth,
      uow,
      messages,
      events,
    }),
    "list-typing": createListTyping({ auth, uow, typing, clock }),
    "upsert-typing": createUpsertTyping({
      auth,
      uow,
      typing,
      clock,
      events,
    }),
    "clear-typing": createClearTyping({ auth, uow, typing, events }),
    "list-presence": createListPresence({ auth, uow, presence }),
    "heartbeat-presence": createHeartbeatPresence({
      auth,
      uow,
      presence,
      events,
    }),
    "disconnect-presence": createDisconnectPresence({
      auth,
      uow,
      presence,
      events,
    }),
  });

  const server = createExpressServer({
    routers: {
      "/use-cases": createExpressUseCaseRouter(useCases, {
        ...(options.jsonBodyLimit === undefined
          ? {}
          : { jsonBodyLimit: options.jsonBodyLimit }),
        ...(options.authRateLimit === undefined
          ? {}
          : { authRateLimit: options.authRateLimit }),
      }),
      "/events": createExpressEventSubscriptionRouter(
        APP_EVENT_TYPES,
        events,
        {
          authorize: async () => (await auth.currentUser()) !== null,
          connectionKey: () => getRequestToken(),
          maxConnectionsPerKey:
            options.sseMaxConnectionsPerToken ??
            DEFAULT_SSE_MAX_CONNECTIONS_PER_TOKEN,
        },
      ),
    },
    port: options.port ?? 3000,
    host: options.host ?? "127.0.0.1",
    middleware: [createBearerSessionMiddleware()],
    ...(options.corsOrigins === undefined
      ? {}
      : { corsOrigins: options.corsOrigins }),
  });

  return { server };
}

function validateUseCases(
  validator: InputValidator,
  useCases: Record<string, HttpUseCase>,
): Record<string, HttpUseCase> {
  const bound: Record<string, HttpUseCase> = {};
  for (const [name, useCase] of Object.entries(useCases)) {
    const schema = useCaseInputSchemas[name];
    bound[name] = createValidatedUseCase({
      validator,
      useCase,
      ...(schema === undefined ? {} : { schema }),
    });
  }
  return bound;
}
