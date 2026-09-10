# Clean Chat

A **Clean Architecture** reimplementation of the Slack-style chat in the sibling **convex-chat** repo. Behavior is defined by [docs/PRODUCT.md](docs/PRODUCT.md), not by Convex APIs. Domain types: [docs/DOMAIN.md](docs/DOMAIN.md).

This repo is a learning demo. It is not a production messenger.

## Status

Domain entities, use-case Input/Output, interactors, in-memory and SQLite persistence, Express HTTP, a composition root (`createServer`), and a Vite + React SPA compile ([docs/DOMAIN.md](docs/DOMAIN.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).

## Layout

| Package | Layer | May import |
| --- | --- | --- |
| `@clean-chat/core` | Domain entities, driving use cases, `AppEvent` + `EventSubscriber` | `@sinclair/typebox` only |
| `@clean-chat/application` | Interactors + driven ports | core |
| `@clean-chat/infrastructure` | Frameworks, drivers, composition root | inner packages |
| `@clean-chat/client` | Driving HTTP `Client` (`createHttpClient`) | core |
| `@clean-chat/web` | Vite + React SPA | client, core |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the dependency rule and how this maps to Uncle Bob’s concentric circles.

## Run it

You need Node 20+.

```bash
npm install
npm run dev
```

That starts:

1. Express on `http://127.0.0.1:3000` (`PORT` / `HOST` override)
2. The Vite SPA on http://localhost:5173 (`VITE_API_URL` defaults to `http://127.0.0.1:3000`)

CORS allows any browser origin on loopback (`CORS_ORIGIN=*`); set `CORS_ORIGIN` to a comma-separated allowlist to restrict it, and you must set an allowlist if `HOST` is not loopback.

`npm start` / `npm run dev` use SQLite at `file:./clean-chat.db`. Override with `SQLITE_URL`. Tests still call `createServer()` with in-memory persistence unless they pass `createSqlPersistence()`.

Open two browser windows, sign up as two users, and watch messages, typing, and who’s-online update without refresh.

API-only (no UI): `npm start`. Use cases are `POST /use-cases/{name}`; events are `GET /events` (SSE, all types, bearer required).

## Scripts

- `npm run dev` — Express + Vite frontend together
- `npm run dev:frontend` / `npm run dev:server` — each process on its own (`npm run dev:types` if you want `tsc -b` watching)
- `npm run typecheck` — `tsc -b` across core/application/infrastructure/client, plus the web app
- `npm test` — Vitest (interactors + in-memory and SQLite persistence + Express HTTP + HTTP client)
- `npm run test:coverage` — same tests with a text, HTML, and LCOV coverage report in `coverage/`
- `npm run build` — emit `packages/{core,application,infrastructure,client}/dist`
- `npm run lint` — oxlint
- `npm run clean` — remove build output
- `npm start` — build and run the Express composition root (no Vite)
