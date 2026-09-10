import type { TokenStore } from "@clean-chat/client";

/** `localStorage` key for the session bearer. */
export const BEARER_STORAGE_KEY = "clean-chat.bearer";

/**
 * Persist the HTTP client bearer in `localStorage` so refresh and extra
 * tabs of the same origin share the session.
 */
export function createLocalStorageTokenStore(): TokenStore {
  return {
    get() {
      const value = localStorage.getItem(BEARER_STORAGE_KEY);
      return value === null || value.length === 0 ? undefined : value;
    },
    set(token) {
      if (token === undefined) {
        localStorage.removeItem(BEARER_STORAGE_KEY);
      } else {
        localStorage.setItem(BEARER_STORAGE_KEY, token);
      }
    },
  };
}
