import { createInMemoryChannelRepository } from "./channel-repository.js";
import { createInMemoryMessageRepository } from "./message-repository.js";
import { createInMemoryPresenceRepository } from "./presence-repository.js";
import { createInMemoryStore } from "./store.js";
import { createInMemoryTypingRepository } from "./typing-repository.js";
import { createInMemoryUnitOfWork } from "./unit-of-work.js";
import { createInMemoryUserRepository } from "./user-repository.js";

export type { InMemoryStore } from "./store.js";
export { createInMemoryStore } from "./store.js";
export { createInMemoryChannelRepository } from "./channel-repository.js";
export { createInMemoryMessageRepository } from "./message-repository.js";
export { createInMemoryPresenceRepository } from "./presence-repository.js";
export { createInMemoryTypingRepository } from "./typing-repository.js";
export { createInMemoryUserRepository } from "./user-repository.js";
export { createInMemoryUnitOfWork } from "./unit-of-work.js";

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
  };
}
