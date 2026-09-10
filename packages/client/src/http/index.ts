/**
 * HTTP transport: platform `fetch` to the Express composition root.
 * Other transports (in-memory, …) live in sibling folders under `src/`.
 */

export type { HttpClientOptions, TokenStore } from "./http-client.js";
export { createHttpClient } from "./http-client.js";
export {
  createHttpEventSubscriber,
  SSE_RECONNECT_BASE_MS,
  SSE_RECONNECT_MAX_MS,
  type HttpEventSubscriber,
  type HttpEventSubscriberOptions,
} from "./http-event-subscriber.js";
export {
  createHttpUseCase,
  readIssuedBearerToken,
  type HttpUseCaseOptions,
} from "./http-use-case.js";
export {
  HttpError,
  isNotAuthenticatedError,
  isSseAuthFailure,
  NOT_AUTHENTICATED_ERROR,
  readHttpErrorMessage,
} from "./http-error.js";
