/**
 * One application action.
 *
 * `Input` and `Output` are JSON-shaped DTOs (TypeBox `Static` types). They are
 * the payloads shared with the UI, not HTTP or WebSocket envelopes.
 *
 * {@link name} is the stable registry id (HTTP `POST /use-cases/{name}`).
 * Use `void` when there is no request body. The signed-in actor is resolved
 * on the server, not from `Input` (except sign-in / sign-up).
 *
 * Persistence runs inside one unit of work. Publish `AppEvent`s after that
 * work commits so other clients never see rolled-back writes.
 */
export interface UseCase<Input, Output, Name extends string = string> {
  /** HTTP path segment and registry key. Same string on every adapter. */
  readonly name: Name;
  execute(input: Input): Promise<Output>;
}
