# Architecture (this Clean Architecture port)

How **clean-chat** will implement [PRODUCT.md](./PRODUCT.md). Copy **behavior**, not Convex APIs. Entity shapes and TypeBox conventions: [DOMAIN.md](./DOMAIN.md).

This document describes the intended dependency rule. Domain entities and use-case Input/Output exist as TypeBox schemas. Writes run inside `UnitOfWork.run`, then publish explicit `AppEvent`s. Persistence and auth are **in-memory** adapters for now. HTTP is Express: `createExpressUseCaseRouter` (`POST /{useCase.name}` → `UseCase.execute`), `createExpressEventSubscriptionRouter` (`GET /{eventType}` SSE → `EventSubscriber`), and `createExpressServer` (path→router map, `Lifecycle`, CORS). `createServer` is the composition root. Known use-case errors map to 401 / 403 / 400; unexpected errors are 500 without a stack. SSE requires a bearer session. The UI talks through `@clean-chat/client` (`createHttpClient`). Not a public REST API. React is **not chosen yet**.

## Why these layers

Uncle Bob’s circles, named to match how we will build:

| Circle | Package | Responsibility |
| --- | --- | --- |
| Core | `@clean-chat/core` | Domain entities (`src/domain/`), driving use cases (`src/use-cases/`), `AppEvent` + `EventSubscriber` (`src/events/`) |
| Application | `@clean-chat/application` | Interactors (`src/interactors/`) plus driven ports |
| Frameworks & drivers | `@clean-chat/infrastructure` | In-memory DB/auth/events, Express HTTP, `createServer`, React later |
| Driving adapters | `@clean-chat/client` | HTTP `createHttpClient` (typed use cases + `eventSubscriber` via `fetch`) |

```
  infrastructure  ──►  application  ──►  core
  client          ──────────────────────►  core
      dependencies point inward only

  core → nothing except TypeBox
  domain folder must not import use-cases or events
```

A use case must not import Postgres, React, or a websocket library. Those appear later as **adapters** that implement ports defined inward.

## Runtime (target, not built)

```
Browser (SPA, port TBD)
  └─ live subscription (SSE) ─► app server
                                                      ├─ use cases
                                                      ├─ persistence adapter
                                                      ├─ auth / sessions
                                                      ├─ typing expiry (TTL or scheduler)
                                                      └─ presence heartbeats
```

Convex mapped `query` → live read and `mutation` → transactional write. This port must preserve that **user-visible** contract (see PRODUCT.md realtime section). The mechanism is an infrastructure decision.

## Use cases

Each action is a `UseCase<Input, Output>` with a readonly `name` (HTTP `POST /use-cases/{name}`). `Input` / `Output` are JSON-shaped TypeBox types (the FE/BE payload). `void` means no body. The actor is not on `Input` except for sign-in / sign-up.

Query use cases are one-shot. Live UI: `EventSubscriber.subscribe` then re-run the query.

| Type | `name` | Input | Output | Publishes |
| --- | --- | --- | --- | --- |
| `SignUp` | `sign-up` | `{ email, password, name }` | `User` | — |
| `SignIn` | `sign-in` | `{ email, password }` | `User` | — |
| `SignOut` | `sign-out` | `void` | `void` | — |
| `GetCurrentUser` | `get-current-user` | `void` | `User \| null` | — |
| `ListChannels` | `list-channels` | `void` | `Channel[]` | — |
| `EnsureGeneralChannel` | `ensure-general-channel` | `void` | `ChannelId` | `channel-list-changed` (if inserted) |
| `CreateChannel` | `create-channel` | `{ name }` | `ChannelId` | `channel-list-changed` (if inserted) |
| `ListMessages` | `list-messages` | `{ channelId }` | `Message[]` | — |
| `SendMessage` | `send-message` | `{ channelId, body }` | `void` | `message-list-changed` |
| `DeleteOwnMessage` | `delete-own-message` | `{ messageId }` | `void` | `message-list-changed` (if deleted) |
| `ListTyping` | `list-typing` | `{ channelId }` | `Typing[]` | — |
| `UpsertTyping` / `ClearTyping` | `upsert-typing` / `clear-typing` | `{ channelId }` | `void` | `typing-changed` |
| `ListPresence` | `list-presence` | `{ channelId }` | `Presence[]` | — |
| `HeartbeatPresence` | `heartbeat-presence` | `{ channelId, sessionId }` | `void` | `presence-changed` (membership only) |
| `DisconnectPresence` | `disconnect-presence` | `{ channelId, sessionId }` | `void` | `presence-changed` (if membership) |

`EventPublisher` (application) and `EventSubscriber` (core) are the same in-memory adapter (`createInMemoryEventBus`). Call `publish` **after** `UnitOfWork.run` commits.

Interactors implement every `UseCase` in `@clean-chat/core/use-cases`. Persistence is in-memory (`packages/infrastructure/src/memory/`).

## Outbound ports

Interfaces live under `packages/application/src/` (repositories in `src/repositories/`). The frontend never imports these. Infrastructure currently implements them in memory.

**Transaction:** one `execute()` is one transaction. `UnitOfWork.run` supplies an opaque `TransactionContext`. Every persistence method takes `tx` first. Use cases only forward it. Do not nest use cases.

**`AuthPort`** (no `tx`): `signUp` / `signIn` / `signOut` / `currentUser`. Sessions and password hashes are not the chat-table unit of work.

**`UserRepository`:** `getById(tx, id)` — display names only.

**`ChannelRepository`:** `list`, `getById`, `getByName`, `insert`.

**`MessageRepository`:** `listLatestByChannel` (join `authorName`), `getById`, `insert(NewMessage)`, `remove`.

**`TypingRepository` / `PresenceRepository`:** list / get / put / remove keyed as in PRODUCT.md.

**`Clock.now()`** and **`IdGenerator.next()`** are not transactional.

```
execute
  └─ uow.run(tx => repos.*(tx, …))
  └─ publisher.publish(event)   // after commit
```

## What lives where (when we fill it in)

| Concern | Layer |
| --- | --- |
| Slug rules, message body limits | Domain TypeBox schemas (`ChannelNameSchema`, `MessageBodySchema`) |
| `Channel names must be 1–32 characters.` | Same strings as PRODUCT.md |
| Password hashing, session | Infrastructure `createInMemoryAuth` (`scrypt` with explicit `N`/`r`/`p`/`maxmem`, bearer tokens). HTTP binds `Authorization: Bearer` per request. `DisconnectPresence` requires that session |
| “Latest 50” | Use case (application rule), not a SQL detail leaked inward |
| Tailwind / shadcn / Vite | Infrastructure or a future `packages/web` driving adapter |
| Selected `channelId` | Presentation state, not a router |
| HTTP `POST /{useCase.name}` | Infrastructure Express router (`createExpressUseCaseRouter`). `void` Output → 204. Known errors → 401/403/400 `{ error }`; unexpected → 500 `Internal server error`. `sign-in`/`sign-up` are rate-limited; JSON body cap 16kb |
| HTTP `GET /{eventType}` SSE | Infrastructure Express router (`createExpressEventSubscriptionRouter`) → `EventSubscriber`. Requires a bearer session; concurrent streams are capped per token |
| HTTP listen / `Lifecycle` | Infrastructure `createExpressServer` / composition root `createServer` (path → router, `port`, optional `host`, optional `corsOrigins`, optional `middleware`). Bound address is `server.port` / `server.host` after `start`. `*` CORS only on loopback; Helmet-equivalent headers |
| HTTP client (`Client`) | `@clean-chat/client` `createHttpClient` (`fetch`). `createHttpUseCase`, `createHttpEventSubscriber`. Non-OK responses throw the `{ error }` string |

## File map (now)

| Path | Role |
| --- | --- |
| `packages/core/src/domain/user/` | `User`, email, display name, password length |
| `packages/core/src/domain/channel/` | `Channel`, slug normalize + pattern |
| `packages/core/src/domain/message/` | `Message`, body limits |
| `packages/core/src/domain/typing/` | `Typing`, debounce / expiry constants |
| `packages/core/src/domain/presence/` | `Presence`, session id |
| `packages/core/src/use-cases/` | Driving ports: import as `@clean-chat/core/use-cases` |
| `packages/core/src/events/` | `AppEvent` payloads and `EventSubscriber` (UI listens) |
| `packages/application/src/` | `EventPublisher`, `UnitOfWork`, `AuthPort`, `Clock`, `IdGenerator` |
| `packages/application/src/repositories/` | Channel, Message, User, Typing, Presence repositories |
| `packages/application/src/interactors/` | `UseCase.execute` implementations |
| `packages/application/test/` | Interactor unit tests (mocked ports) |
| `packages/infrastructure/src/memory/` | In-memory `UnitOfWork`, repositories, `createInMemoryEventBus`, `createInMemoryAuth`, `createSystemClock`, `createRandomIdGenerator` |
| `packages/infrastructure/src/http/` | Express `createExpressServer` (`Lifecycle`) + use-case and event-subscription routers |
| `packages/client/src/http/` | `createHttpClient`, `createHttpUseCase`, `createHttpEventSubscriber` (isomorphic `fetch`) |
| `packages/client/src/index.ts` | Driving `Client` type + HTTP transport |
| `packages/infrastructure/src/index.ts` | Drivers + composition root |
| `packages/infrastructure/src/server.ts` | `createServer` wires adapters, interactors, Express |
| `packages/infrastructure/src/main.ts` | Process entry: listen on `PORT` / `HOST` |
| `docs/PRODUCT.md` | Behavior to match |

## What not to copy from convex-chat

- `api` / `useQuery` / `useMutation` names
- Convex document `_id` / `_creationTime`
- Presence `roomToken` / `sessionToken`
- The word “Convex” in UI copy

## Next

A runnable UI (the chat SPA).
