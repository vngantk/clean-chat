/**
 * Infrastructure layer — frameworks and drivers.
 *
 * Persistence: in-memory (`src/memory/`) and SQLite (`src/sql/`, libSQL).
 * HTTP is Express routers (`src/http/`): `POST /{useCaseName}` invokes a
 * `UseCase`; `GET /{eventType}` is SSE via `EventSubscriber`.
 * `createExpressServer` mounts those routers and implements {@link Lifecycle}.
 * In-memory events are {@link createInMemoryEventBus} (`EventPublisher` +
 * `EventSubscriber`). The isomorphic HTTP driving adapter is
 * `@clean-chat/client` (`createHttpClient`). {@link createInMemoryAuth}
 * (scrypt hashes, bearer tokens per request), {@link createSystemClock}, and
 * {@link createRandomIdGenerator} are here. {@link createServer} is the
 * composition root. This package may import the inner layers and implement
 * their ports. Inner layers must never import this package.
 */

export type { AuthUserStore } from "./auth-user-store.js";
export {
  createInMemoryAuth,
  createInMemoryChannelRepository,
  createInMemoryEventBus,
  createInMemoryMessageRepository,
  createInMemoryPersistence,
  createInMemoryPresenceRepository,
  createInMemoryStore,
  createInMemoryTypingRepository,
  createInMemoryUnitOfWork,
  createInMemoryUserRepository,
  createMemoryAuthUsers,
  createRandomIdGenerator,
  createSystemClock,
  EMAIL_TAKEN_ERROR,
  INVALID_CREDENTIALS_ERROR,
  MAX_SESSIONS,
  MAX_SESSIONS_PER_USER,
  SESSION_SWEEP_MS,
  SESSION_TTL_MS,
  type InMemoryAuth,
  type InMemoryAuthOptions,
  type InMemoryEventBus,
  type InMemoryStore,
} from "./memory/index.js";
export {
  createSqlPersistence,
  type SqlPersistence,
  type SqlPersistenceOptions,
} from "./sql/index.js";
export {
  createExpressEventSubscriptionRouter,
  createExpressServer,
  createExpressUseCaseRouter,
  DEFAULT_SSE_MAX_CONNECTIONS_PER_TOKEN,
  type CorsOrigins,
  type ExpressServer,
  type ExpressServerDeps,
  type HttpUseCase,
  type Lifecycle,
} from "./http/index.js";
export {
  createServer,
  type PersistencePorts,
  type ServerOptions,
} from "./server.js";
