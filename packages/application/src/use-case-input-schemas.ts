import type { TSchema } from "@sinclair/typebox";
import {
  ChannelScopedInputSchema,
  ClearTypingName,
  CreateChannelInputSchema,
  CreateChannelName,
  DeleteOwnMessageInputSchema,
  DeleteOwnMessageName,
  DisconnectPresenceInputSchema,
  DisconnectPresenceName,
  HeartbeatPresenceInputSchema,
  HeartbeatPresenceName,
  ListMessagesInputSchema,
  ListMessagesName,
  ListPresenceInputSchema,
  ListPresenceName,
  ListTypingName,
  SendMessageInputSchema,
  SendMessageName,
  SignInInputSchema,
  SignInName,
  SignUpInputSchema,
  SignUpName,
  UpsertTypingName,
} from "@clean-chat/core/use-cases";

/**
 * Input schema per use-case `name`. Missing / `undefined` means `void` Input.
 */
export const useCaseInputSchemas: Record<string, TSchema | undefined> = {
  [SignUpName]: SignUpInputSchema,
  [SignInName]: SignInInputSchema,
  [CreateChannelName]: CreateChannelInputSchema,
  [ListMessagesName]: ListMessagesInputSchema,
  [SendMessageName]: SendMessageInputSchema,
  [DeleteOwnMessageName]: DeleteOwnMessageInputSchema,
  [ListTypingName]: ChannelScopedInputSchema,
  [UpsertTypingName]: ChannelScopedInputSchema,
  [ClearTypingName]: ChannelScopedInputSchema,
  [ListPresenceName]: ListPresenceInputSchema,
  [HeartbeatPresenceName]: HeartbeatPresenceInputSchema,
  [DisconnectPresenceName]: DisconnectPresenceInputSchema,
};
