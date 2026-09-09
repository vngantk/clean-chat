/**
 * One application action.
 *
 * `Input` and `Output` are JSON-shaped DTOs (TypeBox `Static` types). They are
 * the payloads shared with the UI, not HTTP or WebSocket envelopes.
 *
 * Use `void` when there is no request body. The signed-in actor is injected
 * by the composition root, not placed on `Input` (except sign-in / sign-up).
 */
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>;
}
