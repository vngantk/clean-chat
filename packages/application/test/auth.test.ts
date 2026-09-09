import { describe, expect, it } from "vitest";
import { createGetCurrentUser } from "../src/interactors/get-current-user.js";
import { DISPLAY_NAME_EMPTY_ERROR } from "../src/interactors/sign-up.js";
import { createSignIn } from "../src/interactors/sign-in.js";
import { createSignOut } from "../src/interactors/sign-out.js";
import { createSignUp } from "../src/interactors/sign-up.js";
import { mockAuth, user } from "./doubles.js";

describe("createGetCurrentUser", () => {
  it("returns the session user", async () => {
    const auth = mockAuth(user);
    await expect(createGetCurrentUser(auth).execute()).resolves.toEqual(user);
  });

  it("returns null when signed out", async () => {
    const auth = mockAuth(null);
    await expect(createGetCurrentUser(auth).execute()).resolves.toBeNull();
  });
});

describe("createSignUp", () => {
  it("trims the display name before AuthPort.signUp", async () => {
    const auth = mockAuth();
    await createSignUp(auth).execute({
      email: user.email,
      password: "password1",
      name: "  Ada  ",
    });
    expect(auth.signUp).toHaveBeenCalledWith(user.email, "password1", "Ada");
  });

  it("rejects a blank display name", async () => {
    const auth = mockAuth();
    expect(() =>
      createSignUp(auth).execute({
        email: user.email,
        password: "password1",
        name: "   ",
      }),
    ).toThrow(DISPLAY_NAME_EMPTY_ERROR);
    expect(auth.signUp).not.toHaveBeenCalled();
  });
});

describe("createSignIn", () => {
  it("delegates to AuthPort.signIn", async () => {
    const auth = mockAuth();
    await expect(
      createSignIn(auth).execute({
        email: user.email,
        password: "password1",
      }),
    ).resolves.toEqual(user);
    expect(auth.signIn).toHaveBeenCalledWith(user.email, "password1");
  });
});

describe("createSignOut", () => {
  it("delegates to AuthPort.signOut", async () => {
    const auth = mockAuth();
    await createSignOut(auth).execute();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });
});
