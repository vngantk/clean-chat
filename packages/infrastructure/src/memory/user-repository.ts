import type { UserRepository } from "@clean-chat/application";
import type { InMemoryStore } from "./store.js";

export function createInMemoryUserRepository(
  store: InMemoryStore,
): UserRepository {
  return {
    async getById(_tx, id) {
      const user = store.users.get(id);
      return user ? { ...user } : null;
    },
  };
}
