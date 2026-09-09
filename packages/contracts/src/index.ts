/**
 * Shared contracts the frontend and server both see.
 *
 * Use cases: import from `@clean-chat/contracts/use-cases`, not this barrel.
 * This module is `AppEvent` payloads and `EventSubscriber`.
 *
 * Driven interfaces (repositories, `UnitOfWork`, `AuthPort`, `EventPublisher`) live
 * in `@clean-chat/application`.
 *
 * May import `@clean-chat/domain` and TypeBox. Must not import application or
 * infrastructure.
 */

export * from "./events.js";
export type { EventSubscriber, Unsubscribe } from "./event-subscriber.js";
