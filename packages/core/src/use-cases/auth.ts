import { Type, type Static } from "@sinclair/typebox";
import {
  EmailSchema,
  PasswordSchema,
  UserSchema,
  type User,
} from "../domain/index.js";
import type { UseCase } from "./use-case.js";

/**
 * Sign-up form body. `name` is trimmed in the use case before it must be a display name.
 */
export const SignUpInputSchema = Type.Object(
  {
    email: EmailSchema,
    password: PasswordSchema,
    name: Type.String(),
  },
  { additionalProperties: false },
);

export type SignUpInput = Static<typeof SignUpInputSchema>;

/** HTTP / registry name for {@link SignUp}. */
export const SignUpName = "sign-up" as const;

export type SignUp = UseCase<SignUpInput, User, typeof SignUpName>;

/**
 * Sign-in form body.
 */
export const SignInInputSchema = Type.Object(
  {
    email: EmailSchema,
    password: PasswordSchema,
  },
  { additionalProperties: false },
);

export type SignInInput = Static<typeof SignInInputSchema>;

/** HTTP / registry name for {@link SignIn}. */
export const SignInName = "sign-in" as const;

export type SignIn = UseCase<SignInInput, User, typeof SignInName>;

/** HTTP / registry name for {@link SignOut}. */
export const SignOutName = "sign-out" as const;

export type SignOut = UseCase<void, void, typeof SignOutName>;

/**
 * Session still resolving or signed out → `null`. Does not throw.
 */
export const ViewerSchema = Type.Union([UserSchema, Type.Null()]);

export type Viewer = Static<typeof ViewerSchema>;

/** HTTP / registry name for {@link GetCurrentUser}. */
export const GetCurrentUserName = "get-current-user" as const;

export type GetCurrentUser = UseCase<void, Viewer, typeof GetCurrentUserName>;
