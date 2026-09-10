import type { Client } from "../client.js";
import { createHttpEventSubscriber } from "./http-event-subscriber.js";
import { createHttpUseCase } from "./http-use-case.js";

/**
 * Options for {@link createHttpClient}.
 */
export type HttpClientOptions = {
  /**
   * Origin of the composition root, e.g. `http://127.0.0.1:3000`.
   * Trailing slashes are ignored. Use cases are `POST {baseUrl}/use-cases/{name}`;
   * events are `GET {baseUrl}/events/{type}` (SSE).
   */
  baseUrl: string;
};

function useCaseUrl(baseUrl: string, name: string): string {
  return `${baseUrl}/use-cases/${name}`;
}

/**
 * HTTP transport: each use case is {@link createHttpUseCase} against the
 * matching Express route; {@link Client.eventSubscriber} is
 * {@link createHttpEventSubscriber}. Uses platform `fetch` (Node 20+ and
 * browsers). No Node-only or browser-only libraries.
 */
export function createHttpClient(options: HttpClientOptions): Client {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  return {
    signUp: createHttpUseCase(useCaseUrl(baseUrl, "sign-up")),
    signIn: createHttpUseCase(useCaseUrl(baseUrl, "sign-in")),
    signOut: createHttpUseCase(useCaseUrl(baseUrl, "sign-out")),
    getCurrentUser: createHttpUseCase(useCaseUrl(baseUrl, "get-current-user")),
    listChannels: createHttpUseCase(useCaseUrl(baseUrl, "list-channels")),
    ensureGeneralChannel: createHttpUseCase(
      useCaseUrl(baseUrl, "ensure-general-channel"),
    ),
    createChannel: createHttpUseCase(useCaseUrl(baseUrl, "create-channel")),
    listMessages: createHttpUseCase(useCaseUrl(baseUrl, "list-messages")),
    sendMessage: createHttpUseCase(useCaseUrl(baseUrl, "send-message")),
    deleteOwnMessage: createHttpUseCase(
      useCaseUrl(baseUrl, "delete-own-message"),
    ),
    listTyping: createHttpUseCase(useCaseUrl(baseUrl, "list-typing")),
    upsertTyping: createHttpUseCase(useCaseUrl(baseUrl, "upsert-typing")),
    clearTyping: createHttpUseCase(useCaseUrl(baseUrl, "clear-typing")),
    listPresence: createHttpUseCase(useCaseUrl(baseUrl, "list-presence")),
    heartbeatPresence: createHttpUseCase(
      useCaseUrl(baseUrl, "heartbeat-presence"),
    ),
    disconnectPresence: createHttpUseCase(
      useCaseUrl(baseUrl, "disconnect-presence"),
    ),
    eventSubscriber: createHttpEventSubscriber(`${baseUrl}/events`),
  };
}
