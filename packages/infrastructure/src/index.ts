/**
 * Infrastructure layer — frameworks and drivers.
 *
 * Persistence is an in-memory adapter for now (`src/memory/`). Auth, realtime
 * transport, and a composition root will live here later. This package may
 * import the inner layers and implement their ports. Inner layers must never
 * import this package.
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
