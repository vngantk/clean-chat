/**
 * Application layer — interface adapters.
 *
 * Inbound adapters live here: session/auth context, presenters, and the
 * {@link EventSubscriber} the UI uses to listen for {@link AppEvent}s.
 * This package may import `@clean-chat/domain` and `@clean-chat/use-cases`.
 * It must not import `@clean-chat/infrastructure`.
 */

export type { EventSubscriber, Unsubscribe } from "./event-subscriber.js";
