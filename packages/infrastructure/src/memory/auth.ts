import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { AuthPort, IdGenerator } from "@clean-chat/application";
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

/**
 * In-process auth: scrypt password hashes, bearer session tokens, users
 * written to {@link AuthUserStore} so message joins see display names.
 *
 * HTTP binds the token via AsyncLocalStorage (`Authorization: Bearer`).
 * Outside a request (tests), {@link currentUser} uses the last issued token.
 */
export function createInMemoryAuth(deps: {
  users: AuthUserStore;
  ids: IdGenerator;
}): AuthPort {
  const hashes = new Map<string, string>();
  const sessions = new Map<string, string>();
  let lastToken: string | null = null;

  function copyUser(user: User): User {
    return { ...user };
  }

  function issueToken(userId: string): string {
    const token = randomBytes(TOKEN_BYTES).toString("base64url");
    sessions.set(token, userId);
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

  return {
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
        sessions.delete(token);
      }
      if (lastToken === token) {
        lastToken = null;
      }
    },

    async currentUser() {
      const token = activeToken();
      if (token === null) {
        return null;
      }
      const userId = sessions.get(token);
      if (userId === undefined) {
        return null;
      }
      const user = await deps.users.getById(userId);
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
