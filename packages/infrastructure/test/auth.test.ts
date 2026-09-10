import { describe, expect, it } from "vitest";
import {
  createInMemoryAuth,
  EMAIL_TAKEN_ERROR,
  INVALID_CREDENTIALS_ERROR,
} from "../src/memory/auth.js";
import { createRandomIdGenerator } from "../src/memory/id-generator.js";
import { createInMemoryStore } from "../src/memory/store.js";
import { createInMemoryUserRepository } from "../src/memory/user-repository.js";
import { createInMemoryUnitOfWork } from "../src/memory/unit-of-work.js";

const password = "password1";

function authWithStore() {
  const store = createInMemoryStore();
  const ids = createRandomIdGenerator();
  const auth = createInMemoryAuth({ store, ids });
  return { store, ids, auth };
}

describe("createInMemoryAuth", () => {
  it("signs up, stores the user for joins, and sets the session", async () => {
    const { store, auth } = authWithStore();
    const user = await auth.signUp("ada@example.com", password, "Ada");

    expect(user).toEqual({
      id: user.id,
      email: "ada@example.com",
      name: "Ada",
    });
    expect(user).not.toHaveProperty("password");
    await expect(auth.currentUser()).resolves.toEqual(user);
    expect(store.users.get(user.id)).toEqual(user);

    const users = createInMemoryUserRepository(store);
    const uow = createInMemoryUnitOfWork(store);
    await expect(
      uow.run((tx) => users.getById(tx, user.id)),
    ).resolves.toEqual(user);
  });

  it("rejects a second account with the same email", async () => {
    const { auth } = authWithStore();
    await auth.signUp("ada@example.com", password, "Ada");
    await expect(
      auth.signUp("ada@example.com", password, "Other"),
    ).rejects.toThrow(EMAIL_TAKEN_ERROR);
  });

  it("signs in with the correct password and rejects bad credentials", async () => {
    const { auth } = authWithStore();
    const created = await auth.signUp("ada@example.com", password, "Ada");
    await auth.signOut();
    await expect(auth.currentUser()).resolves.toBeNull();

    await expect(
      auth.signIn("ada@example.com", "wrong-password"),
    ).rejects.toThrow(INVALID_CREDENTIALS_ERROR);
    await expect(
      auth.signIn("missing@example.com", password),
    ).rejects.toThrow(INVALID_CREDENTIALS_ERROR);

    const signedIn = await auth.signIn("ada@example.com", password);
    expect(signedIn).toEqual(created);
    await expect(auth.currentUser()).resolves.toEqual(created);
  });

  it("sign-out clears the session but keeps the account", async () => {
    const { store, auth } = authWithStore();
    const user = await auth.signUp("ada@example.com", password, "Ada");
    await auth.signOut();
    await expect(auth.currentUser()).resolves.toBeNull();
    expect(store.users.get(user.id)).toEqual(user);
  });
});
