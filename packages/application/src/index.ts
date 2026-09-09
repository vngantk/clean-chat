/**
 * Application layer.
 *
 * Driven interfaces the server calls out through (`AuthPort`, repositories,
 * `UnitOfWork`, `EventPublisher`, …) and interactors that implement
 * `UseCase.execute`. Repositories are grouped under `repositories/`;
 * interactors under `interactors/`.
 *
 * This package may import `@clean-chat/domain` and `@clean-chat/contracts`.
 * It must not import `@clean-chat/infrastructure`.
 */

export type { AuthPort } from "./auth.js";
export type { Clock } from "./clock.js";
export type { EventPublisher } from "./event-publisher.js";
export type { IdGenerator } from "./id-generator.js";
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
