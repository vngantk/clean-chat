/**
 * Application layer.
 *
 * Driven interfaces the server calls out through (`AuthPort`, repositories,
 * `UnitOfWork`, `EventPublisher`, `InputValidator`, …) and interactors that implement
 * `UseCase.execute`. Repositories are grouped under `repositories/`;
 * interactors under `interactors/`.
 *
 * This package may import `@clean-chat/core`. It must not import
 * `@clean-chat/infrastructure`.
 */

export type { AuthPort } from "./auth.js";
export type { Clock } from "./clock.js";
export type { EventPublisher } from "./event-publisher.js";
export type { IdGenerator } from "./id-generator.js";
export type { InputValidator } from "./input-validator.js";
export { INVALID_INPUT_ERROR } from "./input-validator.js";
export { NOT_AUTHENTICATED_ERROR } from "./interactors/require-user.js";
export { DISPLAY_NAME_EMPTY_ERROR } from "./interactors/sign-up.js";
export { PRESENCE_DISCONNECT_FORBIDDEN_ERROR } from "./interactors/disconnect-presence.js";
export { createTypeBoxInputValidator } from "./typebox-input-validator.js";
export { createValidatedUseCase } from "./validated-use-case.js";
export { useCaseInputSchemas } from "./use-case-input-schemas.js";
export type { TransactionContext, UnitOfWork } from "./transaction.js";
export type {
  ChannelRepository,
  MessageRepository,
  NewMessage,
  PresenceRepository,
  TypingRepository,
  UserRepository,
} from "./repositories/index.js";
export { NewMessageSchema } from "./repositories/index.js";
export {
  createClearTyping,
  createCreateChannel,
  createDeleteOwnMessage,
  createDisconnectPresence,
  createEnsureGeneralChannel,
  createGetCurrentUser,
  createHeartbeatPresence,
  createListChannels,
  createListMessages,
  createListPresence,
  createListTyping,
  createSendMessage,
  createSignIn,
  createSignOut,
  createSignUp,
  createUpsertTyping,
} from "./interactors/index.js";
