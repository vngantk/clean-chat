/**
 * Infrastructure layer — frameworks and drivers.
 *
 * Persistence is an in-memory adapter (`src/memory/`). HTTP is Express
 * routers (`src/http/`): `POST /{useCaseName}` invokes a `UseCase`;
 * `GET /{eventType}` is SSE via `EventSubscriber`. `createExpressServer`
 * mounts those routers and implements {@link Lifecycle}. In-memory events
 * are {@link createInMemoryEventBus} (`EventPublisher` + `EventSubscriber`).
 * The isomorphic HTTP driving adapter is `@clean-chat/client`
 * (`createHttpClient`). In-memory {@link createInMemoryAuth}
 * (scrypt hashes, one process session), {@link createSystemClock}, and
 * {@link createRandomIdGenerator} are here. {@link createBackend} is the
 * composition root. This
 * package may import the inner layers and implement their ports. Inner
 * layers must never import this package.
 */

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
  createRandomIdGenerator,
  createSystemClock,
  EMAIL_TAKEN_ERROR,
  INVALID_CREDENTIALS_ERROR,
  type InMemoryEventBus,
  type InMemoryStore,
} from "./memory/index.js";
export {
  createExpressEventSubscriptionRouter,
  createExpressServer,
  createExpressUseCaseRouter,
  type ExpressServer,
  type ExpressServerDeps,
  type HttpUseCase,
  type Lifecycle,
} from "./http/index.js";
export { createBackend, type Backend, type BackendOptions } from "./backend.js";
