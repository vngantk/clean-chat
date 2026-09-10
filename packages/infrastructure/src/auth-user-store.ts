import type { User } from "@clean-chat/core/domain";

/**
 * Account records used by {@link createInMemoryAuth}. Password hashes and
 * session tokens stay in process; this store is the user row so message
 * joins can see display names.
 *
 * Not a driven port — AuthPort is. Infrastructure adapters (memory maps or
 * the SQL `users` table) implement this.
 */
export type AuthUserStore = {
  getById(id: string): Promise<User | null>;

  findByEmail(email: string): Promise<User | null>;

  put(user: User): Promise<void>;
};
