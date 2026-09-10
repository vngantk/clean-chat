/**
 * Infrastructure layer — frameworks and drivers.
 *
 * Persistence is an in-memory adapter (`src/memory/`). HTTP is Express
 * routers (`src/http/`): `POST /{useCaseName}` invokes a `UseCase`;
 * `GET /{eventType}` is SSE via `EventSubscriber`. `createExpressServer`
 * mounts those routers and implements {@link Lifecycle}. In-memory events
 * are {@link createInMemoryEventBus} (`EventPublisher` + `EventSubscriber`).
 * HTTP clients are {@link createHttpUseCase} and
 * {@link createHttpEventSubscriber}. Auth and a composition root will live
 * here later. This
 * package may import the inner layers and implement their ports. Inner
 * layers must never import this package.
 */

export {
  createInMemoryChannelRepository,
  createInMemoryEventBus,
  createInMemoryMessageRepository,
  createInMemoryPersistence,
  createInMemoryPresenceRepository,
  createInMemoryStore,
  createInMemoryTypingRepository,
  createInMemoryUnitOfWork,
  createInMemoryUserRepository,
  type InMemoryEventBus,
  type InMemoryStore,
} from "./memory/index.js";
export {
  createExpressEventSubscriptionRouter,
  createExpressServer,
  createExpressUseCaseRouter,
  createHttpEventSubscriber,
  createHttpUseCase,
  type ExpressServer,
  type ExpressServerDeps,
  type HttpUseCase,
  type Lifecycle,
} from "./http/index.js";
