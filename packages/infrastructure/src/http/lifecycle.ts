/**
 * Startable process: HTTP servers, later schedulers, and similar drivers.
 *
 * `start` / `stop` are idempotent only in one direction: a second `start`
 * while running throws; `stop` while stopped is a no-op.
 */
export interface Lifecycle {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}
