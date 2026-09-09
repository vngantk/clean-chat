# Clean Chat

A **Clean Architecture** reimplementation of the Slack-style chat in the sibling **convex-chat** repo. Behavior is defined by [docs/PRODUCT.md](docs/PRODUCT.md), not by Convex APIs. Domain types: [docs/DOMAIN.md](docs/DOMAIN.md).

This repo is a learning demo. It is not a production messenger.

## Status

Domain entities and use-case Input/Output compile as TypeBox types ([docs/DOMAIN.md](docs/DOMAIN.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)). Execute bodies, persistence, and a runnable UI are not written yet.

## Layout

| Package | Layer | May import |
| --- | --- | --- |
| `@clean-chat/domain` | Entities, value objects, domain errors | `@sinclair/typebox` only |
| `@clean-chat/use-cases` | Interactors + outbound ports | domain |
| `@clean-chat/application` | Inbound adapters, presenters, DTOs | domain, use-cases |
| `@clean-chat/infrastructure` | Frameworks, drivers, composition root | inner packages |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the dependency rule and how this maps to Uncle Bob’s concentric circles.

## Run it

You need Node 20+. There is no app to start yet.

```bash
npm install
npm run typecheck
```

## Scripts

- `npm run typecheck` — `tsc -b` across the four packages
- `npm run build` — emit `packages/*/dist`
- `npm run lint` — oxlint
- `npm run clean` — remove build output
