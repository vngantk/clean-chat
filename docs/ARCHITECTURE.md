# Architecture (this Clean Architecture port)

How **clean-chat** will implement [PRODUCT.md](./PRODUCT.md). Copy **behavior**, not Convex APIs.

This document describes the **scaffold** and the intended dependency rule. Inner layers are empty on purpose. Frameworks (database, auth, React, realtime transport) are **not chosen yet**.

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

## Planned use cases

These replace `api.<file>.<export>` in convex-chat. Names are working titles.

| Use case | Product action |
| --- | --- |
| Sign up / sign in / sign out | Auth card |
| Get current user | Sidebar footer, loading gate |
| List channels | Sidebar |
| Ensure general channel | First shell mount |
| Create channel | Sidebar plus button |
| List messages | Thread (latest 50, oldest first, with `authorName`) |
| Send message | Composer |
| Delete own message | Hover trash on own bubbles |
| List / upsert / clear typing | Typing line + 3s expiry |
| Heartbeat / list / disconnect presence | Facepile |

Outbound ports we expect (still unwritten): channel repository, message repository, user/auth port, typing store, presence room, clock, id generator. Live lists need a **subscription** port so the UI is not polling.

## What lives where (when we fill it in)

| Concern | Layer |
| --- | --- |
| Slug rules, message body limits, “author may delete” | Domain (invariants) and/or use case (application policy) — we will decide in Domain |
| `Channel names must be 1–32 characters.` | Same strings as PRODUCT.md |
| Password hashing, session cookies/JWT | Infrastructure (auth adapter) |
| “Latest 50” | Use case (application rule), not a SQL detail leaked inward |
| Tailwind / shadcn / Vite | Infrastructure or a future `packages/web` driving adapter |
| Selected `channelId` | Presentation state, not a router |

## File map (now)

| Path | Role |
| --- | --- |
| `packages/domain/src/index.ts` | Domain barrel (empty) |
| `packages/use-cases/src/index.ts` | Use-case barrel |
| `packages/application/src/index.ts` | Interface-adapter barrel |
| `packages/infrastructure/src/index.ts` | Drivers + future composition root |
| `docs/PRODUCT.md` | Behavior to match |

## What not to copy from convex-chat

- `api` / `useQuery` / `useMutation` names
- Convex document `_id` / `_creationTime`
- Presence `roomToken` / `sessionToken`
- The word “Convex” in UI copy

## Next

Fill **Domain** first: identities, entities, value objects, domain errors. Then use cases and ports. Application and infrastructure stay empty until those discussions.
