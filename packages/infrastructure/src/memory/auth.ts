import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { AuthPort, IdGenerator } from "@clean-chat/application";
import type { User } from "@clean-chat/domain";
import type { InMemoryStore } from "./store.js";

const HASH_LENGTH = 32;

/** Thrown when sign-up uses an email that already has an account. */
export const EMAIL_TAKEN_ERROR = "An account with that email already exists.";

/** Thrown when sign-in email or password does not match. */
export const INVALID_CREDENTIALS_ERROR = "Invalid email or password.";

/**
 * In-process auth: scrypt password hashes, one current session, users written
 * to {@link InMemoryStore.users} so message joins see display names.
 * Not request-scoped — HTTP cookies/JWT are a later adapter.
 */
export function createInMemoryAuth(deps: {
  store: InMemoryStore;
  ids: IdGenerator;
}): AuthPort {
  const hashes = new Map<string, string>();
  let sessionUserId: string | null = null;

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
      sessionUserId = user.id;
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
      sessionUserId = user.id;
      return copyUser(user);
    },

    async signOut() {
      sessionUserId = null;
    },

    async currentUser() {
      if (sessionUserId === null) {
        return null;
      }
      const user = deps.store.users.get(sessionUserId);
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
