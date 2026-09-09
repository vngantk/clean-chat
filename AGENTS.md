# Agent context — clean-chat

Learning demo: the same Slack-style chat as **convex-chat**, rebuilt with **Clean Architecture**. Match [docs/PRODUCT.md](docs/PRODUCT.md). Entity TypeBox schemas: [docs/DOMAIN.md](docs/DOMAIN.md). Do not copy Convex APIs, `useQuery`, or document `_id` fields.

## Stack (scaffold)

- TypeScript (strict, NodeNext) npm workspaces
- Four packages: `domain` → `contracts` → `application` → `infrastructure`
- Domain entities: TypeBox schema first (`XxxSchema`), then `type Xxx = Static<typeof XxxSchema>`
- TypeBox: `@sinclair/typebox` in `@clean-chat/domain`, `@clean-chat/contracts`, and `@clean-chat/application` (`NewMessage`)
- Driving use cases live in `packages/contracts/src/use-cases/`
- Explicit realtime: `AppEvent` + `EventSubscriber` (contracts); `EventPublisher` (application); publish after `UnitOfWork.run` commits
- Persistence: repository ports in application take `TransactionContext`; `AuthPort` does not (sessions/hashes)
- No UI framework, database, auth library, or realtime transport chosen yet

When those are chosen, document them here and in `docs/ARCHITECTURE.md`.

## Mental model

Dependencies point **inward**. Inner packages cannot import outer ones.

| Package | Role |
| --- | --- |
| `packages/domain` | Enterprise rules. TypeBox schemas + plain types. No I/O. |
| `packages/contracts` | Driving use cases (`src/use-cases/`), `AppEvent`, `EventSubscriber`. |
| `packages/application` | Driven ports (repos, `UnitOfWork`, `AuthPort`, `EventPublisher`, …). |
| `packages/infrastructure` | Implements ports. Composition root. Frameworks. |

Preserve JSDoc on public types, ports, and use-case functions.

## Out of scope (unless the user asks)

DMs, file uploads, unread badges, password-reset email, Next.js, pagination beyond 50 messages, a public REST API.

Do not add a client-side URL router unless asked — selected channel is UI state in the original product.

Do not implement a layer until the user is ready to discuss that layer.
