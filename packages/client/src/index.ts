/**
 * Driving adapters for the chat API (browser and Node).
 *
 * Transports live under `src/{transport}/`. HTTP is {@link createHttpClient}
 * (`@clean-chat/client/http`). This package may import `@clean-chat/core`.
 * It must not import `@clean-chat/application` or `@clean-chat/infrastructure`.
 */

export type { Client } from "./client.js";
export {
  createHttpClient,
  createHttpEventSubscriber,
  createHttpUseCase,
  HttpError,
  isNotAuthenticatedError,
  NOT_AUTHENTICATED_ERROR,
  type HttpClientOptions,
  type TokenStore,
} from "./http/index.js";
