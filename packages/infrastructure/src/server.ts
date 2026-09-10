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
import type {
  ChannelRepository,
  MessageRepository,
  PresenceRepository,
  TypingRepository,
  UnitOfWork,
} from "@clean-chat/application";
import type { AppEvent } from "@clean-chat/core";
import type { AuthUserStore } from "./auth-user-store.js";
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
} from "./http/express-server.js";
import {
  createExpressUseCaseRouter,
  type HttpUseCase,
} from "./http/express-use-case-router.js";
import type { AuthRateLimitOptions } from "./http/auth-rate-limit.js";
import type {Lifecycle} from "./http/index.js";

const APP_EVENT_TYPES: AppEvent["type"][] = [
  "channel-list-changed",
  "message-list-changed",
  "typing-changed",
  "presence-changed",
];

export type PersistencePorts = {
  readonly uow: UnitOfWork;
  readonly channels: ChannelRepository;
  readonly messages: MessageRepository;
  readonly typing: TypingRepository;
  readonly presence: PresenceRepository;
  readonly authUsers: AuthUserStore;
};

export type ServerOptions = {
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
  /** Defaults to in-memory. Pass `createSqlPersistence()` for SQLite. */
  persistence?: PersistencePorts;
};

/**
 * Wire persistence, auth, events, use cases, and HTTP.
 * Default bind is `127.0.0.1:3000`. Use `port: 0` in tests.
 */
export function createServer(options: ServerOptions = {}): Lifecycle & { readonly port: number; readonly host: string; }{
  const persistence = options.persistence ?? createInMemoryPersistence();
  const ids = createRandomIdGenerator();
  const clock = createSystemClock();
  const events = createInMemoryEventBus();
  const auth = createInMemoryAuth({ users: persistence.authUsers, ids });
  const { uow, channels, messages, typing, presence } = persistence;
  const validator = options.validator ?? createTypeBoxInputValidator();

  const useCases = validateUseCases(validator, [
    createSignUp(auth),
    createSignIn(auth),
    createSignOut(auth),
    createGetCurrentUser(auth),
    createListChannels({ auth, uow, channels }),
    createEnsureGeneralChannel({auth, uow, channels, ids, events,}),
    createCreateChannel({auth, uow, channels, ids, events,}),
    createListMessages({ auth, uow, messages }),
    createSendMessage({auth, uow, channels, messages, clock, ids, events,}),
    createDeleteOwnMessage({auth, uow, messages, events,}),
    createListTyping({ auth, uow, typing, clock }),
    createUpsertTyping({auth, uow, typing, clock, events,}),
    createClearTyping({ auth, uow, typing, events }),
    createListPresence({ auth, uow, presence }),
    createHeartbeatPresence({auth, uow, presence, events,}),
    createDisconnectPresence({auth, uow, presence, events,}),
  ]);

  return createExpressServer({
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
}

function validateUseCases(
  validator: InputValidator,
  useCases: readonly HttpUseCase[],
): HttpUseCase[] {
  return useCases.map((useCase) => {
    const schema = useCaseInputSchemas[useCase.name];
    return createValidatedUseCase({
      validator,
      useCase,
      ...(schema === undefined ? {} : { schema }),
    });
  });
}
