/**
 * HTTP transport: platform `fetch` to the Express composition root.
 * Other transports (in-memory, …) live in sibling folders under `src/`.
 */

export type { HttpClientOptions } from "./http-client.js";
export { createHttpClient } from "./http-client.js";
export {
  createHttpEventSubscriber,
  type HttpEventSubscriberOptions,
} from "./http-event-subscriber.js";
export {
  createHttpUseCase,
  readIssuedBearerToken,
  type HttpUseCaseOptions,
} from "./http-use-case.js";
