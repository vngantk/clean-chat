import { AsyncLocalStorage } from "node:async_hooks";

type SessionContext = {
  requestToken: string | null;
  issuedToken: string | null;
};

const als = new AsyncLocalStorage<SessionContext>();

/**
 * Run `fn` with the incoming bearer token (HTTP request scope).
 * Nested `AuthPort` calls read {@link getRequestToken}.
 */
export function runWithSessionContext<T>(
  requestToken: string | null,
  fn: () => T,
): T {
  return als.run({ requestToken, issuedToken: null }, fn);
}

/** Incoming `Authorization` bearer token for this async context, if any. */
export function getRequestToken(): string | null {
  return als.getStore()?.requestToken ?? null;
}

/**
 * Token created by sign-in / sign-up in this context. Also becomes the
 * request token so `currentUser` in the same turn sees the new session.
 */
export function setIssuedToken(token: string): void {
  const store = als.getStore();
  if (!store) {
    return;
  }
  store.issuedToken = token;
  store.requestToken = token;
}

/** Newly issued token to send as `Authorization: Bearer` on the response. */
export function getIssuedToken(): string | null {
  return als.getStore()?.issuedToken ?? null;
}
