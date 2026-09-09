/**
 * Use-case layer — application business rules.
 *
 * Interactors are {@link UseCase} types with JSON Input/Output. Persistence
 * goes through repositories inside {@link UnitOfWork.run}. After commit,
 * writes publish {@link AppEvent} through {@link EventPublisher}. This package
 * may import `@clean-chat/domain` and TypeBox. It must not import application
 * or infrastructure.
 */

export type {
  GetCurrentUser,
  SignIn,
  SignInInput,
  SignOut,
  SignUp,
  SignUpInput,
  Viewer,
} from "./auth.js";
export {
  SignInInputSchema,
  SignUpInputSchema,
  ViewerSchema,
} from "./auth.js";

export type {
  ChannelList,
  CreateChannel,
  CreateChannelInput,
  CreateChannelOutput,
  EnsureGeneralChannel,
  ListChannels,
} from "./channels.js";
export {
  ChannelListSchema,
  CreateChannelInputSchema,
  CreateChannelOutputSchema,
} from "./channels.js";

export type {
  AppEvent,
  ChannelListChanged,
  EventPublisher,
  MessageListChanged,
  PresenceChanged,
  TypingChanged,
} from "./events.js";
export {
  AppEventSchema,
  ChannelListChangedSchema,
  MessageListChangedSchema,
  PresenceChangedSchema,
  TypingChangedSchema,
  channelListChanged,
  messageListChanged,
  presenceChanged,
  typingChanged,
} from "./events.js";

export type {
  DeleteOwnMessage,
  DeleteOwnMessageInput,
  ListMessages,
  ListMessagesInput,
  MessageList,
  SendMessage,
  SendMessageInput,
} from "./messages.js";
export {
  DeleteOwnMessageInputSchema,
  ListMessagesInputSchema,
  MessageListSchema,
  SendMessageInputSchema,
} from "./messages.js";

export type {
  DisconnectPresence,
  DisconnectPresenceInput,
  HeartbeatPresence,
  HeartbeatPresenceInput,
  ListPresence,
  ListPresenceInput,
  PresenceList,
} from "./presence.js";
export {
  DisconnectPresenceInputSchema,
  HeartbeatPresenceInputSchema,
  ListPresenceInputSchema,
  PresenceListSchema,
} from "./presence.js";

export type {
  ChannelScopedInput,
  ClearTyping,
  ListTyping,
  TypingList,
  UpsertTyping,
} from "./typing.js";
export { ChannelScopedInputSchema, TypingListSchema } from "./typing.js";

export type { UseCase } from "./use-case.js";

export type {
  AuthPort,
  ChannelRepository,
  Clock,
  IdGenerator,
  MessageRepository,
  NewMessage,
  PresenceRepository,
  TransactionContext,
  TypingRepository,
  UnitOfWork,
  UserRepository,
} from "./ports/index.js";
export { NewMessageSchema } from "./ports/index.js";
