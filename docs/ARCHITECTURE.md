# Architecture (this Clean Architecture port)

How **clean-chat** will implement [PRODUCT.md](./PRODUCT.md). Copy **behavior**, not Convex APIs. Entity shapes and TypeBox conventions: [DOMAIN.md](./DOMAIN.md).

This document describes the intended dependency rule. Domain entities and use-case Input/Output exist as TypeBox schemas. Writes publish explicit `AppEvent`s. Infrastructure (database, auth, React, realtime transport) is **not chosen yet**.

## Why these layers

Uncle Bob’s circles, named to match how we will build:

| Circle | Package | Responsibility |
| --- | --- | --- |
| Entities | `@clean-chat/domain` | Channel / message / user rules that would still be true on another UI |
| Use cases | `@clean-chat/use-cases` | “Send a message”, “create a channel”, … plus **outbound ports** |
| Interface adapters | `@clean-chat/application` | Presenters, inbound facades, DTO mapping |
| Frameworks & drivers | `@clean-chat/infrastructure` | DB, password hashing, websockets, React (later), composition root |

```
  infrastructure  ──►  application  ──►  use-cases  ──►  domain
        │                    │                │
        └─────────────────────┴────────────────────┘
              dependencies point inward only
```

A use case must not import Postgres, React, or a websocket library. Those appear later as **adapters** that implement ports defined inward.

## Runtime (target, not built)

```
Browser (SPA, port TBD)
  └─ live subscription (WS / SSE / equivalent) ─► app server
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

`EventPublisher` (use cases) and `EventSubscriber` (application) are implemented by the same infrastructure adapter later.

Execute bodies and repositories are not written yet.

## What lives where (when we fill it in)

| Concern | Layer |
| --- | --- |
| Slug rules, message body limits | Domain TypeBox schemas (`ChannelNameSchema`, `MessageBodySchema`) |
| `Channel names must be 1–32 characters.` | Same strings as PRODUCT.md |
| Password hashing, session cookies/JWT | Infrastructure (auth adapter) |
| “Latest 50” | Use case (application rule), not a SQL detail leaked inward |
| Tailwind / shadcn / Vite | Infrastructure or a future `packages/web` driving adapter |
| Selected `channelId` | Presentation state, not a router |

## File map (now)

| Path | Role |
| --- | --- |
| `packages/domain/src/user/` | `User`, email, display name, password length |
| `packages/domain/src/channel/` | `Channel`, slug normalize + pattern |
| `packages/domain/src/message/` | `Message`, body limits |
| `packages/domain/src/typing/` | `Typing`, debounce / expiry constants |
| `packages/domain/src/presence/` | `Presence`, session id |
| `packages/use-cases/src/use-case.ts` | `UseCase<Input, Output>` |
| `packages/use-cases/src/events.ts` | `AppEvent` + `EventPublisher` |
| `packages/use-cases/src/auth.ts` … `presence.ts` | Input schemas + use-case types |
| `packages/application/src/event-subscriber.ts` | `EventSubscriber` |
| `packages/infrastructure/src/index.ts` | Drivers + future composition root |
| `docs/PRODUCT.md` | Behavior to match |

## What not to copy from convex-chat

- `api` / `useQuery` / `useMutation` names
- Convex document `_id` / `_creationTime`
- Presence `roomToken` / `sessionToken`
- The word “Convex” in UI copy

## Next

Repository ports and `execute` implementations. Infrastructure implements `EventPublisher` / `EventSubscriber`.
