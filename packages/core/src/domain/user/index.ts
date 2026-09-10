import { Type, type Static } from "@sinclair/typebox";

/**
 * Stable unique identifier for a user.
 */
export const UserIdSchema = Type.String({
  minLength: 1,
  description: "Stable unique user id",
});

export type UserId = Static<typeof UserIdSchema>;

/**
 * Account email. Identifies the user.
 */
export const EmailSchema = Type.String({
  minLength: 1,
  description: "Account email",
});

export type Email = Static<typeof EmailSchema>;

/** Minimum length of a password at sign-up and sign-in. */
export const PASSWORD_MIN_LENGTH = 8;

/** Maximum length of a password so a huge payload cannot stall hashing. */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Plaintext password. Hashing belongs in infrastructure; this schema only
 * encodes the product rule (8–128 characters).
 */
export const PasswordSchema = Type.String({
  minLength: PASSWORD_MIN_LENGTH,
  maxLength: PASSWORD_MAX_LENGTH,
  description: "Plaintext password (8–128 characters)",
});

export type Password = Static<typeof PasswordSchema>;

/**
 * Display name shown on messages, typing, presence, and the sidebar.
 * Stored value is already trimmed and non-empty.
 */
export const DisplayNameSchema = Type.String({
  minLength: 1,
  description: "Trimmed display name",
});

export type DisplayName = Static<typeof DisplayNameSchema>;

/**
 * Signed-in user. Password hashes are not part of this entity.
 */
export const UserSchema = Type.Object(
  {
    id: UserIdSchema,
    email: EmailSchema,
    name: DisplayNameSchema,
  },
  { additionalProperties: false },
);

export type User = Static<typeof UserSchema>;

/**
 * Trim a display name. Empty after trim is invalid ({@link DisplayNameSchema}).
 */
export function trimDisplayName(name: string): string {
  return name.trim();
}
