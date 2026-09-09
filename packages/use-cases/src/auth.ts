import { Type, type Static } from "@sinclair/typebox";
import {
  EmailSchema,
  PasswordSchema,
  UserSchema,
  type User,
} from "@clean-chat/domain";
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

export type SignUp = UseCase<SignUpInput, User>;

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

export type SignIn = UseCase<SignInInput, User>;

export type SignOut = UseCase<void, void>;

/**
 * Session still resolving or signed out → `null`. Does not throw.
 */
export const ViewerSchema = Type.Union([UserSchema, Type.Null()]);

export type Viewer = Static<typeof ViewerSchema>;

export type GetCurrentUser = UseCase<void, Viewer>;
