# Architecture (this Clean Architecture port)

How **clean-chat** will implement [PRODUCT.md](./PRODUCT.md). Copy **behavior**, not Convex APIs. Entity shapes and TypeBox conventions: [DOMAIN.md](./DOMAIN.md).

This document describes the intended dependency rule. Domain entities and use-case Input/Output exist as TypeBox schemas. Writes run inside `UnitOfWork.run`, then publish explicit `AppEvent`s. Persistence is an **in-memory** adapter for now. HTTP is Express: `createExpressUseCaseRouter` (`POST /{useCaseName}` → `UseCase.execute`), `createExpressEventSubscriptionRouter` (`GET /{eventType}` SSE → `EventSubscriber`), and `createExpressServer` (path→router map, `Lifecycle`). Clients: `createHttpUseCase`, `createHttpEventSubscriber`. Not a public REST API. Auth and React are **not chosen yet**.

## Why these layers

Uncle Bob’s circles, named to match how we will build:

| Circle | Package | Responsibility |
| --- | --- | --- |
| Entities | `@clean-chat/domain` | Channel / message / user rules that would still be true on another UI |
| Contracts | `@clean-chat/contracts` | Driving use cases (`src/use-cases/`), `AppEvent`, `EventSubscriber` |
| Application | `@clean-chat/application` | Interactors (`src/interactors/`) plus driven ports |
| Frameworks & drivers | `@clean-chat/infrastructure` | In-memory DB, Express HTTP server + routers, password hashing / React later, composition root |

```
  infrastructure  ──►  application  ──►  contracts  ──►  domain
        │                    │                │
        └─────────────────────┴────────────────────┘
              dependencies point inward only
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

Each action is a `UseCase<Input, Output>`. `Input` / `Output` are JSON-shaped TypeBox types (the FE/BE payload). `void` means no body. The actor is not on `Input` except for sign-in / sign-up.

Query use cases are one-shot. Live UI: `EventSubscriber.subscribe` then re-run the query.

| Type | Input | Output | Publishes |
| --- | --- | --- | --- |
| `SignUp` | `{ email, password, name }` | `User` | — |
| `SignIn` | `{ email, password }` | `User` | — |
| `SignOut` | `void` | `void` | — |
| `GetCurrentUser` | `void` | `User \| null` | — |
| `ListChannels` | `void` | `Channel[]` | — |
| `EnsureGeneralChannel` | `void` | `ChannelId` | `channel-list-changed` (if inserted) |
| `CreateChannel` | `{ name }` | `ChannelId` | `channel-list-changed` (if inserted) |
| `ListMessages` | `{ channelId }` | `Message[]` | — |
| `SendMessage` | `{ channelId, body }` | `void` | `message-list-changed` |
| `DeleteOwnMessage` | `{ messageId }` | `void` | `message-list-changed` (if deleted) |
| `ListTyping` | `{ channelId }` | `Typing[]` | — |
| `UpsertTyping` / `ClearTyping` | `{ channelId }` | `void` | `typing-changed` |
| `ListPresence` | `{ channelId }` | `Presence[]` | — |
| `HeartbeatPresence` | `{ channelId, sessionId }` | `void` | `presence-changed` (membership only) |
| `DisconnectPresence` | `{ channelId, sessionId }` | `void` | `presence-changed` (if membership) |

`EventPublisher` (application) and `EventSubscriber` (contracts) are the same in-memory adapter (`createInMemoryEventBus`). Call `publish` **after** `UnitOfWork.run` commits.

Interactors implement every `UseCase` in `@clean-chat/contracts/use-cases`. Persistence is in-memory (`packages/infrastructure/src/memory/`).

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
| Password hashing, session cookies/JWT | Infrastructure (auth adapter) |
| “Latest 50” | Use case (application rule), not a SQL detail leaked inward |
| Tailwind / shadcn / Vite | Infrastructure or a future `packages/web` driving adapter |
| Selected `channelId` | Presentation state, not a router |
| HTTP `POST /{useCaseName}` | Infrastructure Express router (`createExpressUseCaseRouter`). `void` Output → 204 |
| HTTP `GET /{eventType}` SSE | Infrastructure Express router (`createExpressEventSubscriptionRouter`) → `EventSubscriber` |
| HTTP listen / `Lifecycle` | Infrastructure `createExpressServer` (path → router, `port`, optional `host`) |
| HTTP client (`UseCase` / `EventSubscriber`) | Infrastructure `createHttpUseCase`, `createHttpEventSubscriber` |

## File map (now)

| Path | Role |
| --- | --- |
| `packages/domain/src/user/` | `User`, email, display name, password length |
| `packages/domain/src/channel/` | `Channel`, slug normalize + pattern |
| `packages/domain/src/message/` | `Message`, body limits |
| `packages/domain/src/typing/` | `Typing`, debounce / expiry constants |
| `packages/domain/src/presence/` | `Presence`, session id |
| `packages/contracts/src/use-cases/` | Driving ports: import as `@clean-chat/contracts/use-cases` |
| `packages/contracts/src/events.ts` | `AppEvent` payloads |
| `packages/contracts/src/event-subscriber.ts` | `EventSubscriber` (UI listens) |
| `packages/application/src/` | `EventPublisher`, `UnitOfWork`, `AuthPort`, `Clock`, `IdGenerator` |
| `packages/application/src/repositories/` | Channel, Message, User, Typing, Presence repositories |
| `packages/application/src/interactors/` | `UseCase.execute` implementations |
| `packages/application/test/` | Interactor unit tests (mocked ports) |
| `packages/infrastructure/src/memory/` | In-memory `UnitOfWork`, repositories, and `createInMemoryEventBus` |
| `packages/infrastructure/src/http/` | Express `createExpressServer` (`Lifecycle`) + use-case and event-subscription routers + HTTP clients |
| `packages/infrastructure/src/index.ts` | Drivers + future composition root |
| `docs/PRODUCT.md` | Behavior to match |

## What not to copy from convex-chat

- `api` / `useQuery` / `useMutation` names
- Convex document `_id` / `_creationTime`
- Presence `roomToken` / `sessionToken`
- The word “Convex” in UI copy

## Next

In-memory `AuthPort`, `Clock`, and `IdGenerator`, then a composition root.
