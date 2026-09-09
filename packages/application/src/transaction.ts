/**
 * Opaque handle for one unit of work. Infrastructure casts its driver
 * (SQL client, Prisma transaction, …) to this type. Use cases only forward it
 * into repository methods.
 */
declare const transactionContextBrand: unique symbol;

export type TransactionContext = {
  readonly [transactionContextBrand]: true;
};

/**
 * Transaction boundary for one {@link UseCase} `execute` call.
 *
 * A repository method is not a transaction. `run` is. Read-only use cases
 * still call `run` so they see a consistent snapshot.
 *
 * Do not nest use cases. Compose repositories inside a single `run`.
 */
export interface UnitOfWork {
  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}
