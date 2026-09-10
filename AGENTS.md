# Agent context — clean-chat

Learning demo: the same Slack-style chat as **convex-chat**, rebuilt with **Clean Architecture**. Match [docs/PRODUCT.md](docs/PRODUCT.md). Entity TypeBox schemas: [docs/DOMAIN.md](docs/DOMAIN.md). Do not copy Convex APIs, `useQuery`, or document `_id` fields.

## Stack (scaffold)

- TypeScript (strict, NodeNext) npm workspaces
- Three packages: `core` → `application` → `infrastructure`
- Domain entities: TypeBox schema first (`XxxSchema`), then `type Xxx = Static<typeof XxxSchema>`
- TypeBox: `@sinclair/typebox` in `@clean-chat/core` and `@clean-chat/application` (`NewMessage`)
- Driving use cases live in `packages/core/src/use-cases/` and are imported as `@clean-chat/core/use-cases`
- Domain entities live in `packages/core/src/domain/` and are imported as `@clean-chat/core/domain`. That folder must not import use-cases or events
- Explicit realtime: `AppEvent` + `EventSubscriber` (`@clean-chat/core`); `EventPublisher` (application); publish after `UnitOfWork.run` commits
- Interactor tests: Vitest, ports mocked (`npm test`); coverage via `npm run test:coverage`; in-memory persistence tests live next to the adapter
- Persistence: in-memory adapters in `@clean-chat/infrastructure` (`src/memory/`). Repository ports take `TransactionContext`; `AuthPort` does not (sessions/hashes). `createInMemoryAuth` (scrypt, one process session), `createSystemClock`, `createRandomIdGenerator`
- Events: `createInMemoryEventBus` implements `EventPublisher` and `EventSubscriber` in one object
- HTTP: Express in `@clean-chat/infrastructure` (`src/http/`). `createExpressUseCaseRouter` mounts `POST /{useCaseName}` → `UseCase.execute`. `createExpressEventSubscriptionRouter` mounts `GET /{eventType}` SSE via `EventSubscriber`. `createExpressServer` takes a path→router map, `port`, and optional `host`, and returns a `Lifecycle`. Clients: `createHttpUseCase(url)` POSTs JSON; `createHttpEventSubscriber(baseUrl)` implements `EventSubscriber` over SSE `fetch`. JSON / **204** for use cases (`void` → 204 No Content). Not a public REST API
- Composition root: `createBackend` in `@clean-chat/infrastructure` (`src/backend.ts`); `src/main.ts` listens. `POST /use-cases/{name}`, `GET /events/{type}`
- No UI framework or cookie/JWT session library chosen yet

When those are chosen, document them here and in `docs/ARCHITECTURE.md`.

## Mental model

Dependencies point **inward**. Inner packages cannot import outer ones.

```
infrastructure  →  application  →  core
core → nothing (except TypeBox)
```

| Package | Role |
| --- | --- |
| `packages/core` | Domain entities (`src/domain/`), driving use cases (`src/use-cases/`), `AppEvent` + `EventSubscriber` (`src/events/`). No I/O. |
| `packages/application` | Driven ports plus interactors (`src/interactors/`) that implement `UseCase.execute`. |
| `packages/infrastructure` | In-memory persistence, auth, event bus, Express HTTP, composition root (`createBackend`). |

Preserve JSDoc on public types, ports, and use-case functions.

## Out of scope (unless the user asks)

DMs, file uploads, unread badges, password-reset email, Next.js, pagination beyond 50 messages, a public REST API.

Do not add a client-side URL router unless asked — selected channel is UI state in the original product.

Do not implement a layer until the user is ready to discuss that layer.
