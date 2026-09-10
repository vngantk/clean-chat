/**
 * Infrastructure layer — frameworks and drivers.
 *
 * Persistence is an in-memory adapter (`src/memory/`). HTTP is Express
 * routers (`src/http/`): `POST /{useCaseName}` invokes a `UseCase`;
 * `GET /{eventType}` is SSE via `EventSubscriber`. `createExpressServer`
 * mounts those routers and implements {@link Lifecycle}. Auth, an in-memory
 * event bus, and a composition root will live here later. This
 * package may import the inner layers and implement their ports. Inner
 * layers must never import this package.
 */

export {
  createInMemoryChannelRepository,
  createInMemoryMessageRepository,
  createInMemoryPersistence,
  createInMemoryPresenceRepository,
  createInMemoryStore,
  createInMemoryTypingRepository,
  createInMemoryUnitOfWork,
  createInMemoryUserRepository,
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
