import type { AppEvent } from "./events.js";

/** Stop receiving events. Call on unmount, channel change, or sign-out. */
export type Unsubscribe = () => void;

/**
 * Outbound port for the UI / controller. Subscribe by event `type`, then
 * re-run the matching query use case. Filter `channelId` in the handler
 * when the selected room is React state.
 *
 * Implemented in infrastructure together with `EventPublisher`.
 */
export interface EventSubscriber {
  subscribe<T extends AppEvent["type"]>(
    type: T,
    handler: (event: Extract<AppEvent, { type: T }>) => void,
  ): Unsubscribe;

  /**
   * Drop every handler and abort the transport (HTTP SSE). Safe when
   * already closed. In-memory adapters may no-op.
   */
  close?(): void;
}
