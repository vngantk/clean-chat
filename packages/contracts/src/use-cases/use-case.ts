/**
 * One application action.
 *
 * `Input` and `Output` are JSON-shaped DTOs (TypeBox `Static` types). They are
 * the payloads shared with the UI, not HTTP or WebSocket envelopes.
 *
 * Use `void` when there is no request body. The signed-in actor comes from
 * `AuthPort.currentUser()`, not from `Input` (except sign-in / sign-up).
 *
 * Persistence runs inside `UnitOfWork.run`. Publish `AppEvent`s after `run`
 * resolves so other clients never see rolled-back writes.
 */
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>;
}
