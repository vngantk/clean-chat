import type { UseCase } from "@clean-chat/core/use-cases";
import {
  ClearTypingName,
  CreateChannelName,
  DeleteOwnMessageName,
  DisconnectPresenceName,
  EnsureGeneralChannelName,
  GetCurrentUserName,
  HeartbeatPresenceName,
  ListChannelsName,
  ListMessagesName,
  ListPresenceName,
  ListTypingName,
  SendMessageName,
  SignInName,
  SignOutName,
  SignUpName,
  UpsertTypingName,
} from "@clean-chat/core/use-cases";
import type { Client } from "../client.js";
import { bearerAuthorizationHeader } from "./bearer.js";
import { createHttpEventSubscriber } from "./http-event-subscriber.js";
import {
  createHttpUseCase,
  readIssuedBearerToken,
} from "./http-use-case.js";

/**
 * Persist a bearer token across reloads (e.g. `localStorage`).
 * When provided, {@link createHttpClient} reads it on each request so another
 * tab’s sign-out is visible without restarting the client.
 */
export type TokenStore = {
  get(): string | undefined;
  set(token: string | undefined): void;
};

/**
 * Options for {@link createHttpClient}.
 */
export type HttpClientOptions = {
  /**
   * Origin of the composition root, e.g. `http://127.0.0.1:3000`.
   * Trailing slashes are ignored. Use cases are `POST {baseUrl}/use-cases/{name}`;
   * events are `GET {baseUrl}/events` (one multiplexed SSE for every type).
   */
  baseUrl: string;
  /** Optional persistence for the session bearer (browser `localStorage`). */
  tokenStore?: TokenStore;
};

function toUseCaseUrl(baseUrl: string, name: string): string {
  return `${baseUrl}/use-cases/${name}`;
}

/**
 * HTTP transport: each use case is {@link createHttpUseCase} against the
 * matching Express route; {@link Client.eventSubscriber} is
 * {@link createHttpEventSubscriber}. Uses platform `fetch` (Node 20+ and
 * browsers). Holds a bearer token from sign-in / sign-up response
 * `Authorization` and sends it on later requests. {@link HttpClientOptions.tokenStore}
 * persists that token across reloads.
 */
export function createHttpClient(options: HttpClientOptions): Client {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const tokenStore = options.tokenStore;
  let bearer: string | undefined = tokenStore?.get();

  function readBearer(): string | undefined {
    return tokenStore !== undefined ? tokenStore.get() : bearer;
  }

  function writeBearer(token: string | undefined): void {
    bearer = token;
    tokenStore?.set(token);
  }

  const httpOptions = {
    getHeaders: () => {
      const token = readBearer();
      return token === undefined
        ? {}
        : { authorization: bearerAuthorizationHeader(token) };
    },
    onResponse: (response: Response) => {
      const issued = readIssuedBearerToken(response);
      if (issued !== null) {
        writeBearer(issued);
      }
    },
  };

  function httpUseCase<I, O, N extends string>(name: N): UseCase<I, O, N> {
    return createHttpUseCase(name, toUseCaseUrl(baseUrl, name), httpOptions);
  }

  const signOut = httpUseCase<void, void, typeof SignOutName>(SignOutName);

  return {
    signUp: httpUseCase(SignUpName),
    signIn: httpUseCase(SignInName),
    signOut: {
      name: SignOutName,
      async execute() {
        await signOut.execute();
        writeBearer(undefined);
      },
    },
    getCurrentUser: httpUseCase(GetCurrentUserName),
    listChannels: httpUseCase(ListChannelsName),
    ensureGeneralChannel: httpUseCase(EnsureGeneralChannelName),
    createChannel: httpUseCase(CreateChannelName),
    listMessages: httpUseCase(ListMessagesName),
    sendMessage: httpUseCase(SendMessageName),
    deleteOwnMessage: httpUseCase(DeleteOwnMessageName),
    listTyping: httpUseCase(ListTypingName),
    upsertTyping: httpUseCase(UpsertTypingName),
    clearTyping: httpUseCase(ClearTypingName),
    listPresence: httpUseCase(ListPresenceName),
    heartbeatPresence: httpUseCase(HeartbeatPresenceName),
    disconnectPresence: httpUseCase(DisconnectPresenceName),
    eventSubscriber: createHttpEventSubscriber(`${baseUrl}/events`, {
      getHeaders: httpOptions.getHeaders,
    }),
  };
}
