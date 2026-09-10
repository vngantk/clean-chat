import type {
  DisplayName,
  Email,
  Password,
  User,
} from "@clean-chat/core/domain";

/**
 * Identity and session. Not part of the chat-table unit of work — password
 * hashes and session tokens are usually a different store.
 *
 * `SignUp` trims/validates `name` then calls {@link signUp}. Actor for other
 * use cases is {@link currentUser}, not a field on `Input`. The HTTP adapter
 * binds the actor from `Authorization: Bearer` for the request.
 */
export interface AuthPort {
  signUp(
    email: Email,
    password: Password,
    name: DisplayName,
  ): Promise<User>;

  signIn(email: Email, password: Password): Promise<User>;

  signOut(): Promise<void>;

  currentUser(): Promise<User | null>;
}
