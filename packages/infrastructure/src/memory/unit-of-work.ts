import type { TransactionContext, UnitOfWork } from "@clean-chat/application";
import {
  restoreStore,
  snapshotStore,
  type InMemoryStore,
} from "./store.js";

const tx = {} as TransactionContext;

/**
 * Runs work against the in-memory store. Concurrent `run` calls are
 * serialized so one transaction cannot restore an older snapshot over
 * another’s committed writes. On throw, maps are restored to the snapshot
 * taken at the start of that `run`.
 */
export function createInMemoryUnitOfWork(store: InMemoryStore): UnitOfWork {
  let tail: Promise<void> = Promise.resolve();

  return {
    async run(work) {
      let release!: () => void;
      const previous = tail;
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      const snapshot = snapshotStore(store);
      try {
        return await work(tx);
      } catch (error) {
        restoreStore(store, snapshot);
        throw error;
      } finally {
        release();
      }
    },
  };
}
