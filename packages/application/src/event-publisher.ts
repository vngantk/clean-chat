import type { AppEvent } from "@clean-chat/core";

/**
 * Outbound port. Call **after** `UnitOfWork.run` commits so subscribers never
 * see rolled-back writes. Implemented in infrastructure together with
 * `EventSubscriber`.
 */
export interface EventPublisher {
  publish(event: AppEvent): Promise<void>;
}
