import { createInMemoryChannelRepository } from "./channel-repository.js";
import { createInMemoryMessageRepository } from "./message-repository.js";
import { createInMemoryPresenceRepository } from "./presence-repository.js";
import { createInMemoryStore } from "./store.js";
import { createInMemoryTypingRepository } from "./typing-repository.js";
import { createInMemoryUnitOfWork } from "./unit-of-work.js";
import { createInMemoryUserRepository } from "./user-repository.js";
import { createMemoryAuthUsers } from "./auth.js";

export type { InMemoryStore } from "./store.js";
export { createInMemoryStore } from "./store.js";
export { createInMemoryChannelRepository } from "./channel-repository.js";
export { createInMemoryMessageRepository } from "./message-repository.js";
export { createInMemoryPresenceRepository } from "./presence-repository.js";
export { createInMemoryTypingRepository } from "./typing-repository.js";
export { createInMemoryUserRepository } from "./user-repository.js";
export { createInMemoryUnitOfWork } from "./unit-of-work.js";
export {
  createInMemoryEventBus,
  type InMemoryEventBus,
} from "./event-bus.js";
export {
  createInMemoryAuth,
  createMemoryAuthUsers,
  EMAIL_TAKEN_ERROR,
  INVALID_CREDENTIALS_ERROR,
  MAX_SESSIONS,
  MAX_SESSIONS_PER_USER,
  SESSION_SWEEP_MS,
  SESSION_TTL_MS,
  type InMemoryAuth,
  type InMemoryAuthOptions,
} from "./auth.js";
export { createSystemClock } from "./clock.js";
export { createRandomIdGenerator } from "./id-generator.js";

/**
 * One in-memory database plus repositories and a rolling-back unit of work.
 */
export function createInMemoryPersistence() {
  const store = createInMemoryStore();
  return {
    store,
    uow: createInMemoryUnitOfWork(store),
    channels: createInMemoryChannelRepository(store),
    messages: createInMemoryMessageRepository(store),
    users: createInMemoryUserRepository(store),
    typing: createInMemoryTypingRepository(store),
    presence: createInMemoryPresenceRepository(store),
    authUsers: createMemoryAuthUsers(store),
  };
}
