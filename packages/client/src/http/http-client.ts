import type { Client } from "../client.js";
import {
  bearerAuthorizationHeader,
} from "./bearer.js";
import { createHttpEventSubscriber } from "./http-event-subscriber.js";
import {
  createHttpUseCase,
  readIssuedBearerToken,
} from "./http-use-case.js";

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
 * browsers). Holds a bearer token from sign-in / sign-up response
 * `Authorization` and sends it on later requests.
 */
export function createHttpClient(options: HttpClientOptions): Client {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  let bearer: string | undefined;

  const httpOptions = {
    getHeaders: () =>
      bearer === undefined
        ? {}
        : { authorization: bearerAuthorizationHeader(bearer) },
    onResponse: (response: Response) => {
      const issued = readIssuedBearerToken(response);
      if (issued !== null) {
        bearer = issued;
      }
    },
  };

  const signOut = createHttpUseCase<void, void>(
    useCaseUrl(baseUrl, "sign-out"),
    httpOptions,
  );

  return {
    signUp: createHttpUseCase(useCaseUrl(baseUrl, "sign-up"), httpOptions),
    signIn: createHttpUseCase(useCaseUrl(baseUrl, "sign-in"), httpOptions),
    signOut: {
      async execute() {
        await signOut.execute();
        bearer = undefined;
      },
    },
    getCurrentUser: createHttpUseCase(
      useCaseUrl(baseUrl, "get-current-user"),
      httpOptions,
    ),
    listChannels: createHttpUseCase(
      useCaseUrl(baseUrl, "list-channels"),
      httpOptions,
    ),
    ensureGeneralChannel: createHttpUseCase(
      useCaseUrl(baseUrl, "ensure-general-channel"),
      httpOptions,
    ),
    createChannel: createHttpUseCase(
      useCaseUrl(baseUrl, "create-channel"),
      httpOptions,
    ),
    listMessages: createHttpUseCase(
      useCaseUrl(baseUrl, "list-messages"),
      httpOptions,
    ),
    sendMessage: createHttpUseCase(
      useCaseUrl(baseUrl, "send-message"),
      httpOptions,
    ),
    deleteOwnMessage: createHttpUseCase(
      useCaseUrl(baseUrl, "delete-own-message"),
      httpOptions,
    ),
    listTyping: createHttpUseCase(
      useCaseUrl(baseUrl, "list-typing"),
      httpOptions,
    ),
    upsertTyping: createHttpUseCase(
      useCaseUrl(baseUrl, "upsert-typing"),
      httpOptions,
    ),
    clearTyping: createHttpUseCase(
      useCaseUrl(baseUrl, "clear-typing"),
      httpOptions,
    ),
    listPresence: createHttpUseCase(
      useCaseUrl(baseUrl, "list-presence"),
      httpOptions,
    ),
    heartbeatPresence: createHttpUseCase(
      useCaseUrl(baseUrl, "heartbeat-presence"),
      httpOptions,
    ),
    disconnectPresence: createHttpUseCase(
      useCaseUrl(baseUrl, "disconnect-presence"),
      httpOptions,
    ),
    eventSubscriber: createHttpEventSubscriber(`${baseUrl}/events`, {
      getHeaders: httpOptions.getHeaders,
    }),
  };
}
