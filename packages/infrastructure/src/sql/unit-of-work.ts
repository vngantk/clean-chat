import type { UnitOfWork } from "@clean-chat/application";
import type { Client } from "@libsql/client";
import { asTransactionContext } from "./session.js";

/**
 * One {@link UnitOfWork.run} is one libSQL write transaction. Rollback on
 * throw; commit only if `work` returns.
 */
export function createSqlUnitOfWork(client: Client): UnitOfWork {
  return {
    async run(work) {
      const tx = await client.transaction("write");
      try {
        const result = await work(asTransactionContext(tx));
        await tx.commit();
        return result;
      } catch (error) {
        if (!tx.closed) {
          await tx.rollback();
        }
        throw error;
      } finally {
        tx.close();
      }
    },
  };
}
