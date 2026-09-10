/**
 * Innermost layer: domain entities, driving use cases, and events.
 *
 * Use cases: import from `@clean-chat/core/use-cases`, not this barrel.
 * Domain entities: import from `@clean-chat/core/domain`.
 * This module is `AppEvent` payloads and `EventSubscriber`.
 *
 * Driven interfaces (repositories, `UnitOfWork`, `AuthPort`, `EventPublisher`) live
 * in `@clean-chat/application`.
 *
 * May import TypeBox. Must not import application or infrastructure.
 * `src/domain/` must not import `src/use-cases/` or `src/events/`.
 */

export * from "./events/index.js";
