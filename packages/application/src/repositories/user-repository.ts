import type { User, UserId } from "@clean-chat/domain";
import type { TransactionContext } from "../transaction.js";

/**
 * Read-only user lookup for display (message authors). Creates and credentials
 * live on {@link AuthPort}.
 */
export interface UserRepository {
  getById(tx: TransactionContext, id: UserId): Promise<User | null>;
}
