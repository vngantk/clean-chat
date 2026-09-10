import { describe, expect, it } from "vitest";
import {
  createInMemoryAuth,
  createMemoryAuthUsers,
  EMAIL_TAKEN_ERROR,
  INVALID_CREDENTIALS_ERROR,
} from "../src/memory/auth.js";
import {
  getIssuedToken,
  runWithSessionContext,
} from "../src/memory/session-context.js";
import { createRandomIdGenerator } from "../src/memory/id-generator.js";
import { createInMemoryStore } from "../src/memory/store.js";
import { createInMemoryUserRepository } from "../src/memory/user-repository.js";
import { createInMemoryUnitOfWork } from "../src/memory/unit-of-work.js";

const password = "password1";

function authWithStore() {
  const store = createInMemoryStore();
  const ids = createRandomIdGenerator();
  const auth = createInMemoryAuth({
    users: createMemoryAuthUsers(store),
    ids,
  });
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

  it("isolates two sessions by bearer token", async () => {
    const { auth } = authWithStore();
    const ada = await runWithSessionContext(null, async () => {
      const user = await auth.signUp("ada@example.com", password, "Ada");
      return { user, token: getIssuedToken() };
    });
    const grace = await runWithSessionContext(null, async () => {
      const user = await auth.signUp("grace@example.com", password, "Grace");
      return { user, token: getIssuedToken() };
    });
    expect(ada.token).toBeTruthy();
    expect(grace.token).toBeTruthy();
    expect(ada.token).not.toBe(grace.token);

    await runWithSessionContext(ada.token, async () => {
      await expect(auth.currentUser()).resolves.toEqual(ada.user);
    });
    await runWithSessionContext(grace.token, async () => {
      await expect(auth.currentUser()).resolves.toEqual(grace.user);
    });
    await runWithSessionContext(null, async () => {
      await expect(auth.currentUser()).resolves.toBeNull();
    });
  });

  it("sign-out clears the session but keeps the account", async () => {
    const { store, auth } = authWithStore();
    const user = await auth.signUp("ada@example.com", password, "Ada");
    await auth.signOut();
    await expect(auth.currentUser()).resolves.toBeNull();
    expect(store.users.get(user.id)).toEqual(user);
  });
});
