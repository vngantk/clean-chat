/**
 * Stable ids for channels and messages. Not transactional.
 * `AuthPort.signUp` may mint user ids itself.
 */
export interface IdGenerator {
  next(): string;
}
