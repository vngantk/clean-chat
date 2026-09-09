# Agent context — clean-chat

Learning demo: the same Slack-style chat as **convex-chat**, rebuilt with **Clean Architecture**. Match [docs/PRODUCT.md](docs/PRODUCT.md). Entity TypeBox schemas: [docs/DOMAIN.md](docs/DOMAIN.md). Do not copy Convex APIs, `useQuery`, or document `_id` fields.

## Stack (scaffold)

- TypeScript (strict, NodeNext) npm workspaces
- Four packages: `domain` → `use-cases` → `application` → `infrastructure`
- Domain entities: TypeBox schema first (`XxxSchema`), then `type Xxx = Static<typeof XxxSchema>`
- TypeBox: `@sinclair/typebox` in `@clean-chat/domain` only (until a later layer needs it)
- No UI framework, database, auth library, or realtime transport chosen yet

When those are chosen, document them here and in `docs/ARCHITECTURE.md`.

## Mental model

Dependencies point **inward**. Inner packages cannot import outer ones.

| Package | Role |
| --- | --- |
| `packages/domain` | Enterprise rules. TypeBox schemas + plain types. No I/O. |
| `packages/use-cases` | One interactor per product action. Outbound ports (repositories, clock) live here. |
| `packages/application` | Interface adapters: presenters, inbound ports the UI will call. |
| `packages/infrastructure` | Implements ports. Composition root. Frameworks. |

Preserve JSDoc on public types, ports, and use-case functions.

## Out of scope (unless the user asks)

DMs, file uploads, unread badges, password-reset email, Next.js, pagination beyond 50 messages, a public REST API.

Do not add a client-side URL router unless asked — selected channel is UI state in the original product.

Do not implement a layer until the user is ready to discuss that layer.
