# Clean Chat

A **Clean Architecture** reimplementation of the Slack-style chat in the sibling **convex-chat** repo. Behavior is defined by [docs/PRODUCT.md](docs/PRODUCT.md), not by Convex APIs. Domain types: [docs/DOMAIN.md](docs/DOMAIN.md).

This repo is a learning demo. It is not a production messenger.

## Status

Domain entities, use-case Input/Output, interactors, in-memory adapters, Express HTTP, and a composition root (`createBackend`) compile ([docs/DOMAIN.md](docs/DOMAIN.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)). A runnable UI is not written yet.

## Layout

| Package | Layer | May import |
| --- | --- | --- |
| `@clean-chat/domain` | Entities, value objects, domain errors | `@sinclair/typebox` only |
| `@clean-chat/contracts` | Driving use cases + `AppEvent` + `EventSubscriber` | domain |
| `@clean-chat/application` | Interactors + driven ports | domain, contracts |
| `@clean-chat/infrastructure` | Frameworks, drivers, composition root | inner packages |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the dependency rule and how this maps to Uncle Bob’s concentric circles.

## Run it

You need Node 20+.

```bash
npm install
npm run typecheck
npm test
npm start
```

`npm start` builds and listens on `http://127.0.0.1:3000` (`PORT` / `HOST` override). Use cases are `POST /use-cases/{name}`; events are `GET /events/{type}` (SSE).

## Scripts

- `npm run typecheck` — `tsc -b` across the four packages
- `npm test` — Vitest (interactors + in-memory persistence + Express HTTP)
- `npm run build` — emit `packages/*/dist`
- `npm run lint` — oxlint
- `npm run clean` — remove build output
- `npm start` — build and run the Express composition root
