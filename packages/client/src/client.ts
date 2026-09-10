import type { EventSubscriber } from "@clean-chat/core";
import type {
  ClearTyping,
  CreateChannel,
  DeleteOwnMessage,
  DisconnectPresence,
  EnsureGeneralChannel,
  GetCurrentUser,
  HeartbeatPresence,
  ListChannels,
  ListMessages,
  ListPresence,
  ListTyping,
  SendMessage,
  SignIn,
  SignOut,
  SignUp,
  UpsertTyping,
} from "@clean-chat/core/use-cases";

/**
 * Driving-side chat API. Every transport (`createHttpClient`, later others)
 * returns this shape so the UI depends on use-case types, not a wire format.
 */
export type Client = {
  signUp: SignUp;
  signIn: SignIn;
  signOut: SignOut;
  getCurrentUser: GetCurrentUser;
  listChannels: ListChannels;
  ensureGeneralChannel: EnsureGeneralChannel;
  createChannel: CreateChannel;
  listMessages: ListMessages;
  sendMessage: SendMessage;
  deleteOwnMessage: DeleteOwnMessage;
  listTyping: ListTyping;
  upsertTyping: UpsertTyping;
  clearTyping: ClearTyping;
  listPresence: ListPresence;
  heartbeatPresence: HeartbeatPresence;
  disconnectPresence: DisconnectPresence;
  eventSubscriber: EventSubscriber;
  /**
   * Register a listener for a rejected bearer (401 `Not authenticated` or
   * SSE 401/403). The stored token is already cleared. Returns unsubscribe.
   */
  onAuthFailure(handler: () => void): () => void;
};
