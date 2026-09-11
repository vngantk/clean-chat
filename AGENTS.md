# Agent context — clean-chat

Learning demo: the same Slack-style chat as **convex-chat**, rebuilt with **Clean Architecture**. Match [docs/PRODUCT.md](docs/PRODUCT.md). Entity TypeBox schemas: [docs/DOMAIN.md](docs/DOMAIN.md). Do not copy Convex APIs, `useQuery`, or document `_id` fields.

## Stack (scaffold)

- TypeScript (strict, NodeNext) npm workspaces; web package is bundler-mode
- Packages: `core` → `application` → `infrastructure`; `client` → `core`; `web` → `client` + `core`
- Domain entities: TypeBox schema first (`XxxSchema`), then `type Xxx = Static<typeof XxxSchema>`
- TypeBox: `@sinclair/typebox` in `@clean-chat/core` and `@clean-chat/application` (`NewMessage`)
- Driving use cases live in `packages/core/src/use-cases/` and are imported as `@clean-chat/core/use-cases`. Each `UseCase` has a readonly `name` (`SignUpName` = `"sign-up"`, …) used as the HTTP path
- Domain entities live in `packages/core/src/domain/` and are imported as `@clean-chat/core/domain`. That folder must not import use-cases or events
- Explicit realtime: `AppEvent` + `EventSubscriber` (`@clean-chat/core`); `EventPublisher` (application); publish after `UnitOfWork.run` commits
- Interactor tests: Vitest, ports mocked (`npm test`); coverage via `npm run test:coverage`; in-memory persistence tests live next to the adapter
- Persistence: in-memory (`src/memory/`) and SQLite (`src/sql/`, libSQL) adapters in `@clean-chat/infrastructure`. Repository ports take `TransactionContext`; `AuthPort` does not (sessions/hashes). `createInMemoryAuth` (scrypt with explicit cost params, bearer tokens via `Authorization`, AsyncLocalStorage per request) writes user rows through `AuthUserStore` so message joins see display names. `createSystemClock`, `createRandomIdGenerator`
- Events: `createInMemoryEventBus` implements `EventPublisher` and `EventSubscriber` in one object
- HTTP server: Express in `@clean-chat/infrastructure` (`src/http/`). `createExpressUseCaseRouter` mounts `POST /{useCase.name}` → `UseCase.execute`. `createExpressEventSubscriptionRouter` mounts `GET /{eventType}` SSE via `EventSubscriber`. `createExpressServer` takes a path→router map, `port`, optional `host`, optional `corsOrigins` (`*` on loopback only; same-origin `[]` when serving a SPA), optional `staticDir` (Vite `dist` at `/`), and returns a `Lifecycle` with `port` / `host` / `app` / `server`. JSON / **204** for use cases (`void` → 204 No Content). Known errors are 401 / 403 / 400 `{ error }`; unexpected errors are 500 without a stack. SSE requires a bearer session. Not a public REST API
- HTTP client: `@clean-chat/client` (`src/http/`). `createHttpClient({ baseUrl, tokenStore? })` returns a `Client` (typed use-case properties + `eventSubscriber`) over platform `fetch` (Node 20+ and browsers). Stores the bearer token from sign-in / sign-up `Authorization` and sends it on later requests. Optional `tokenStore` persists the bearer (the SPA uses `localStorage`). Non-OK responses throw the server `{ error }` string. Use-case POSTs use `keepalive: true`. SSE is one multiplexed `GET /events` stream (reconnects with backoff). Also `createHttpUseCase(name, url)` and `createHttpEventSubscriber(baseUrl)`. Import as `@clean-chat/client` or `@clean-chat/client/http`. Other transports may live in sibling folders later
- Composition root: `createServer` in `@clean-chat/infrastructure` (`src/server.ts`); `src/main.ts` listens. `createServer()` defaults to in-memory (tests). The process entry uses SQLite (`file:./clean-chat.db`, override with `SQLITE_URL`). `POST /use-cases/{name}`, `GET /events` (SSE, all types; per-type `GET /events/{type}` still exists). `npm start` also serves `@clean-chat/web` `dist` at `/` (`STATIC_DIR`, or `off` for API-only). `CORS_ORIGIN` (default `*` on loopback when no SPA, same-origin when serving the SPA, or a comma-separated allowlist). Off-loopback binds without a SPA require an explicit allowlist
- UI: Vite + React 19 + Tailwind 4 + shadcn/ui (`base-nova`) in `@clean-chat/web`. No client-side URL router. Session is `Authorization: Bearer` (not cookies/JWT library). Cookie flags / CSRF are skipped because there are no cookies. `npm start` serves the SPA from Express. `npm run dev` runs Express (`127.0.0.1:3000`) and Vite (`localhost:5173`). `VITE_API_URL` defaults to `http://127.0.0.1:3000` in Vite `dev` and same-origin in production builds.

## Mental model

Dependencies point **inward**. Inner packages cannot import outer ones.

```
infrastructure  →  application  →  core
client          ──────────────────►  core
web             →  client ─────────►  core
core → nothing (except TypeBox)
```

| Package | Role |
| --- | --- |
| `packages/core` | Domain entities (`src/domain/`), driving use cases (`src/use-cases/`), `AppEvent` + `EventSubscriber` (`src/events/`). No I/O. |
| `packages/application` | Driven ports plus interactors (`src/interactors/`) that implement `UseCase.execute`. |
| `packages/infrastructure` | In-memory and SQLite persistence, auth, event bus, Express HTTP, composition root (`createServer`). |
| `packages/client` | Driving adapters for the UI: HTTP `createHttpClient` (isomorphic `fetch`). Must not import application or infrastructure. |
| `packages/web` | Chat SPA. Imports `@clean-chat/client` and `@clean-chat/core` only. |

Preserve JSDoc on public types, ports, and use-case functions.

## Out of scope (unless the user asks)

DMs, file uploads, unread badges, password-reset email, Next.js, pagination beyond 50 messages, a public REST API.

Do not add a client-side URL router unless asked — selected channel is UI state in the original product.

Do not implement a layer until the user is ready to discuss that layer.
