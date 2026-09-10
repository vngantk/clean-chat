import type { EventPublisher } from "@clean-chat/application";
import type { AppEvent, EventSubscriber } from "@clean-chat/core";

/**
 * In-process event bus: interactors {@link EventPublisher.publish} after
 * commit; HTTP SSE (and tests) {@link EventSubscriber.subscribe} by type.
 */
export type InMemoryEventBus = EventPublisher & EventSubscriber;

/**
 * Same object for both ports. Delivery is synchronous inside `publish`.
 * There is no replay: a handler only sees events published after subscribe.
 * A throwing handler is isolated so one subscriber cannot fail the publisher
 * after a use case has already committed.
 */
export function createInMemoryEventBus(): InMemoryEventBus {
  const handlers = new Map<AppEvent["type"], Set<(event: AppEvent) => void>>();

  return {
    async publish(event) {
      const set = handlers.get(event.type);
      if (!set) {
        return;
      }
      for (const handler of Array.from(set)) {
        try {
          handler(event);
        } catch {
          // Isolate delivery so a dead SSE client cannot 500 a committed write.
        }
      }
    },

    subscribe(type, handler) {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      const wrapped = handler as (event: AppEvent) => void;
      set.add(wrapped);
      return () => {
        set.delete(wrapped);
        if (set.size === 0) {
          handlers.delete(type);
        }
      };
    },
  };
}
