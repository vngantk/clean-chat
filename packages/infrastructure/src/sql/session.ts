import type { TransactionContext } from "@clean-chat/application";
import type { InValue, Row, Transaction } from "@libsql/client";

/**
 * libSQL interactive transaction, stored as {@link TransactionContext}.
 * Repositories only forward `tx`; they do not import this module's types
 * into application code.
 */
export type SqlExecutor = Pick<Transaction, "execute">;

export function asTransactionContext(
  executor: SqlExecutor,
): TransactionContext {
  return executor as unknown as TransactionContext;
}

export function executorOf(tx: TransactionContext): SqlExecutor {
  return tx as unknown as SqlExecutor;
}

export async function query(
  tx: TransactionContext,
  sql: string,
  args: InValue[] = [],
): Promise<Row[]> {
  const result = await executorOf(tx).execute({ sql, args });
  return result.rows;
}

export async function execute(
  tx: TransactionContext,
  sql: string,
  args: InValue[] = [],
): Promise<void> {
  await executorOf(tx).execute({ sql, args });
}

export function requiredString(row: Row, column: string): string {
  const value = row[column];
  if (typeof value !== "string") {
    throw new Error(`expected column ${column} to be a string`);
  }
  return value;
}

export function requiredUnixTime(row: Row, column: string): number {
  const value = row[column];
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "bigint" && value >= 0n) {
    const asNumber = Number(value);
    if (Number.isSafeInteger(asNumber)) {
      return asNumber;
    }
  }
  throw new Error(`expected column ${column} to be a unix time`);
}

export function requiredBoolean(row: Row, column: string): boolean {
  const value = row[column];
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "bigint") {
    return value !== 0n;
  }
  throw new Error(`expected column ${column} to be booleanish`);
}
