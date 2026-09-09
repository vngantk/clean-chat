import type { TransactionContext, UnitOfWork } from "@clean-chat/application";
import {
  restoreStore,
  snapshotStore,
  type InMemoryStore,
} from "./store.js";

const tx = {} as TransactionContext;

/**
 * Runs work against the in-memory store. On throw, maps are restored to the
 * snapshot taken at the start of {@link UnitOfWork.run}.
 */
export function createInMemoryUnitOfWork(store: InMemoryStore): UnitOfWork {
  return {
    async run(work) {
      const snapshot = snapshotStore(store);
      try {
        return await work(tx);
      } catch (error) {
        restoreStore(store, snapshot);
        throw error;
      }
    },
  };
}
