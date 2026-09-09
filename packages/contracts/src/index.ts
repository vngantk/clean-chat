/**
 * Shared contracts the frontend and server both see.
 *
 * - `use-cases/` — driving ports: `UseCase<Input, Output>` and JSON I/O
 * - `events.ts` — `AppEvent` payloads
 * - `event-subscriber.ts` — UI listens for those events
 *
 * Driven interfaces (repositories, `UnitOfWork`, `AuthPort`, `EventPublisher`) live
 * in `@clean-chat/application`.
 *
 * May import `@clean-chat/domain` and TypeBox. Must not import application or
 * infrastructure.
 */

export * from "./use-cases/index.js";
export * from "./events.js";
export type { EventSubscriber, Unsubscribe } from "./event-subscriber.js";
