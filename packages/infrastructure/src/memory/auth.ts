import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { AuthPort, Clock, IdGenerator } from "@clean-chat/application";
import type { User } from "@clean-chat/core/domain";
import type { AuthUserStore } from "../auth-user-store.js";
import {
  getRequestToken,
  hasSessionContext,
  setIssuedToken,
} from "./session-context.js";
import type { InMemoryStore } from "./store.js";

const HASH_LENGTH = 32;
const TOKEN_BYTES = 32;
/** Node defaults, set explicitly so cost does not drift with the runtime. */
const SCRYPT = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
} as const;

/** Thrown when sign-up uses an email that already has an account. */
export const EMAIL_TAKEN_ERROR = "An account with that email already exists.";

/** Thrown when sign-in email or password does not match. */
export const INVALID_CREDENTIALS_ERROR = "Invalid email or password.";

/** Bearer sessions expire after this many milliseconds (24 hours). */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Cap concurrent sessions per user; oldest tokens are revoked first. */
export const MAX_SESSIONS_PER_USER = 8;

/** Hard cap on the sessions map; oldest tokens are revoked first. */
export const MAX_SESSIONS = 10_000;

/** How often expired sessions are swept. `0` disables the interval. */
export const SESSION_SWEEP_MS = 60_000;

type SessionRecord = {
  userId: string;
  createdAt: number;
};

/** Map-backed {@link AuthUserStore} sharing {@link InMemoryStore.users}. */
export function createMemoryAuthUsers(store: InMemoryStore): AuthUserStore {
  return {
    async getById(id) {
      const user = store.users.get(id);
      return user ? { ...user } : null;
    },

    async findByEmail(email) {
      for (const user of store.users.values()) {
        if (user.email === email) {
          return { ...user };
        }
      }
      return null;
    },

    async put(user) {
      store.users.set(user.id, { ...user });
    },
  };
}

export type InMemoryAuth = AuthPort & {
  /** Whether this bearer still maps to a non-expired session. */
  hasSession(token: string): boolean;
  /** Fired when a token is deleted (sign-out, TTL, or eviction). */
  onSessionRevoked(handler: (token: string) => void): () => void;
  /** Stop the TTL sweep interval. */
  stop(): void;
};

export type InMemoryAuthOptions = {
  users: AuthUserStore;
  ids: IdGenerator;
  /** Defaults to `Date.now()`. Injected in tests. */
  clock?: Clock;
  sessionTtlMs?: number;
  maxSessionsPerUser?: number;
  maxSessions?: number;
  /** Defaults to {@link SESSION_SWEEP_MS}. `0` skips the interval. */
  sessionSweepMs?: number;
};

/**
 * In-process auth: scrypt password hashes, bearer session tokens, users
 * written to {@link AuthUserStore} so message joins see display names.
 *
 * HTTP binds the token via AsyncLocalStorage (`Authorization: Bearer`).
 * Outside a request (tests), {@link AuthPort.currentUser} uses the last issued token.
 * Sessions expire after {@link SESSION_TTL_MS} and are capped per user and overall.
 */
export function createInMemoryAuth(deps: InMemoryAuthOptions): InMemoryAuth {
  const hashes = new Map<string, string>();
  const sessions = new Map<string, SessionRecord>();
  const revokeHandlers = new Set<(token: string) => void>();
  const ttlMs = deps.sessionTtlMs ?? SESSION_TTL_MS;
  const maxPerUser = deps.maxSessionsPerUser ?? MAX_SESSIONS_PER_USER;
  const maxSessions = deps.maxSessions ?? MAX_SESSIONS;
  const now = () => deps.clock?.now() ?? Date.now();
  let lastToken: string | null = null;

  function copyUser(user: User): User {
    return { ...user };
  }

  function notifyRevoked(token: string): void {
    for (const handler of revokeHandlers) {
      handler(token);
    }
  }

  function revoke(token: string): void {
    if (!sessions.delete(token)) {
      return;
    }
    if (lastToken === token) {
      lastToken = null;
    }
    notifyRevoked(token);
  }

  function expireIfNeeded(token: string): void {
    const record = sessions.get(token);
    if (record === undefined) {
      return;
    }
    if (now() - record.createdAt >= ttlMs) {
      revoke(token);
    }
  }

  function sweepExpired(): void {
    for (const token of [...sessions.keys()]) {
      expireIfNeeded(token);
    }
  }

  function evictOldest(tokens: string[]): void {
    let oldest: { token: string; createdAt: number } | undefined;
    for (const token of tokens) {
      const record = sessions.get(token);
      if (record === undefined) {
        continue;
      }
      if (oldest === undefined || record.createdAt < oldest.createdAt) {
        oldest = { token, createdAt: record.createdAt };
      }
    }
    if (oldest !== undefined) {
      revoke(oldest.token);
    }
  }

  function tokensForUser(userId: string): string[] {
    const tokens: string[] = [];
    for (const [token, record] of sessions) {
      if (record.userId === userId) {
        tokens.push(token);
      }
    }
    return tokens;
  }

  function issueToken(userId: string): string {
    sweepExpired();
    while (tokensForUser(userId).length >= maxPerUser) {
      evictOldest(tokensForUser(userId));
    }
    while (sessions.size >= maxSessions) {
      evictOldest([...sessions.keys()]);
    }
    const token = randomBytes(TOKEN_BYTES).toString("base64url");
    sessions.set(token, { userId, createdAt: now() });
    lastToken = token;
    setIssuedToken(token);
    return token;
  }

  function activeToken(): string | null {
    if (hasSessionContext()) {
      return getRequestToken();
    }
    return lastToken;
  }

  function hasSession(token: string): boolean {
    expireIfNeeded(token);
    return sessions.has(token);
  }

  const sweepMs = deps.sessionSweepMs ?? SESSION_SWEEP_MS;
  const sweepTimer =
    sweepMs > 0
      ? setInterval(() => {
          sweepExpired();
        }, sweepMs)
      : undefined;
  sweepTimer?.unref();

  return {
    hasSession,

    onSessionRevoked(handler) {
      revokeHandlers.add(handler);
      return () => {
        revokeHandlers.delete(handler);
      };
    },

    stop() {
      if (sweepTimer !== undefined) {
        clearInterval(sweepTimer);
      }
    },

    async signUp(email, password, name) {
      if (await deps.users.findByEmail(email)) {
        throw new Error(EMAIL_TAKEN_ERROR);
      }
      const user: User = {
        id: deps.ids.next(),
        email,
        name,
      };
      hashes.set(user.id, await hashPassword(password));
      await deps.users.put(copyUser(user));
      issueToken(user.id);
      return copyUser(user);
    },

    async signIn(email, password) {
      const user = await deps.users.findByEmail(email);
      const stored = user ? hashes.get(user.id) : undefined;
      if (!user || stored === undefined) {
        throw new Error(INVALID_CREDENTIALS_ERROR);
      }
      if (!(await verifyPassword(password, stored))) {
        throw new Error(INVALID_CREDENTIALS_ERROR);
      }
      issueToken(user.id);
      return copyUser(user);
    },

    async signOut() {
      const token = activeToken();
      if (token !== null) {
        revoke(token);
      }
    },

    async currentUser() {
      const token = activeToken();
      if (token === null) {
        return null;
      }
      expireIfNeeded(token);
      const record = sessions.get(token);
      if (record === undefined) {
        return null;
      }
      const user = await deps.users.getById(record.userId);
      return user ? copyUser(user) : null;
    },
  };
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await deriveKey(password, salt);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const separator = stored.indexOf(":");
  if (separator <= 0) {
    return false;
  }
  const salt = Buffer.from(stored.slice(0, separator), "hex");
  const expected = Buffer.from(stored.slice(separator + 1), "hex");
  const actual = await deriveKey(password, salt);
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, HASH_LENGTH, SCRYPT, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      if (!Buffer.isBuffer(derivedKey)) {
        reject(new Error("scrypt returned a non-buffer"));
        return;
      }
      resolve(derivedKey);
    });
  });
}
