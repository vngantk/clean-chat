import type { TSchema } from "@sinclair/typebox";
import {
  ChannelScopedInputSchema,
  CreateChannelInputSchema,
  DeleteOwnMessageInputSchema,
  DisconnectPresenceInputSchema,
  HeartbeatPresenceInputSchema,
  ListMessagesInputSchema,
  ListPresenceInputSchema,
  SendMessageInputSchema,
  SignInInputSchema,
  SignUpInputSchema,
} from "@clean-chat/core/use-cases";

/**
 * Input schema per HTTP use-case name. Missing / `undefined` means `void` Input.
 */
export const useCaseInputSchemas: Record<string, TSchema | undefined> = {
  "sign-up": SignUpInputSchema,
  "sign-in": SignInInputSchema,
  "create-channel": CreateChannelInputSchema,
  "list-messages": ListMessagesInputSchema,
  "send-message": SendMessageInputSchema,
  "delete-own-message": DeleteOwnMessageInputSchema,
  "list-typing": ChannelScopedInputSchema,
  "upsert-typing": ChannelScopedInputSchema,
  "clear-typing": ChannelScopedInputSchema,
  "list-presence": ListPresenceInputSchema,
  "heartbeat-presence": HeartbeatPresenceInputSchema,
  "disconnect-presence": DisconnectPresenceInputSchema,
};
