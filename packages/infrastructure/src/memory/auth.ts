import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { AuthPort, IdGenerator } from "@clean-chat/application";
import type { User } from "@clean-chat/core/domain";
import {
  getRequestToken,
  setIssuedToken,
} from "./session-context.js";
import type { InMemoryStore } from "./store.js";

const HASH_LENGTH = 32;
const TOKEN_BYTES = 32;

/** Thrown when sign-up uses an email that already has an account. */
export const EMAIL_TAKEN_ERROR = "An account with that email already exists.";

/** Thrown when sign-in email or password does not match. */
export const INVALID_CREDENTIALS_ERROR = "Invalid email or password.";

/**
 * In-process auth: scrypt password hashes, bearer session tokens, users
 * written to {@link InMemoryStore.users} so message joins see display names.
 *
 * HTTP binds the token via AsyncLocalStorage (`Authorization: Bearer`).
 * Outside a request (tests), {@link currentUser} uses the last issued token.
 */
export function createInMemoryAuth(deps: {
  store: InMemoryStore;
  ids: IdGenerator;
}): AuthPort {
  const hashes = new Map<string, string>();
  const sessions = new Map<string, string>();
  let lastToken: string | null = null;

  function userByEmail(email: string): User | undefined {
    for (const user of deps.store.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

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
    return getRequestToken() ?? lastToken;
  }

  return {
    async signUp(email, password, name) {
      if (userByEmail(email)) {
        throw new Error(EMAIL_TAKEN_ERROR);
      }
      const user: User = {
        id: deps.ids.next(),
        email,
        name,
      };
      hashes.set(user.id, await hashPassword(password));
      deps.store.users.set(user.id, copyUser(user));
      issueToken(user.id);
      return copyUser(user);
    },

    async signIn(email, password) {
      const user = userByEmail(email);
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
      const user = deps.store.users.get(userId);
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
    scrypt(password, salt, HASH_LENGTH, (err, derivedKey) => {
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
