# Clean Chat

A **Clean Architecture** reimplementation of the Slack-style chat in the sibling **convex-chat** repo. Behavior is defined by [docs/PRODUCT.md](docs/PRODUCT.md), not by Convex APIs. Domain types: [docs/DOMAIN.md](docs/DOMAIN.md).

This repo is a learning demo. It is not a production messenger.

## Status

Domain entities, use-case Input/Output, interactors, in-memory adapters, Express HTTP, and a composition root (`createBackend`) compile ([docs/DOMAIN.md](docs/DOMAIN.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)). A runnable UI is not written yet.

## Layout

| Package | Layer | May import |
| --- | --- | --- |
| `@clean-chat/core` | Domain entities, driving use cases, `AppEvent` + `EventSubscriber` | `@sinclair/typebox` only |
| `@clean-chat/application` | Interactors + driven ports | core |
| `@clean-chat/infrastructure` | Frameworks, drivers, composition root | inner packages |
| `@clean-chat/client` | Driving HTTP `Client` (`createHttpClient`) | core |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the dependency rule and how this maps to Uncle Bob’s concentric circles.

## Run it

You need Node 20+.

```bash
npm install
npm run typecheck
npm test
npm start
```

`npm start` builds and listens on `http://127.0.0.1:3000` (`PORT` / `HOST` override). CORS allows any browser origin by default (`CORS_ORIGIN=*`); set `CORS_ORIGIN` to a comma-separated allowlist to restrict it. Use cases are `POST /use-cases/{name}`; events are `GET /events/{type}` (SSE).

## Scripts

- `npm run typecheck` — `tsc -b` across the four packages
- `npm test` — Vitest (interactors + in-memory persistence + Express HTTP + HTTP client)
- `npm run test:coverage` — same tests with a text, HTML, and LCOV coverage report in `coverage/`
- `npm run build` — emit `packages/*/dist`
- `npm run lint` — oxlint
- `npm run clean` — remove build output
- `npm start` — build and run the Express composition root
