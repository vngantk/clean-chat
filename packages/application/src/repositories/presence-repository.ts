import type {
  ChannelId,
  Presence,
  SessionId,
  UnixTimeMs,
} from "@clean-chat/core/domain";
import type { TransactionContext } from "../transaction.js";

/**
 * One row per `(channelId, sessionId)`. Heartbeat/disconnect compare previous
 * vs new inside `UnitOfWork.run`, then publish after commit if membership
 * changed. Heartbeat also drops this session from other channels.
 */
export interface PresenceRepository {
  listByChannel(
    tx: TransactionContext,
    channelId: ChannelId,
  ): Promise<Presence[]>;

  get(
    tx: TransactionContext,
    channelId: ChannelId,
    sessionId: SessionId,
  ): Promise<Presence | null>;

  put(tx: TransactionContext, presence: Presence): Promise<void>;

  remove(
    tx: TransactionContext,
    channelId: ChannelId,
    sessionId: SessionId,
  ): Promise<void>;

  /**
   * Drop this tab from every room except {@link keepChannelId}.
   * A tab is only present in the channel it has open.
   *
   * @returns Channel ids that had an online row removed.
   */
  removeSessionFromOtherChannels(
    tx: TransactionContext,
    sessionId: SessionId,
    keepChannelId: ChannelId,
  ): Promise<ChannelId[]>;

  /**
   * Delete rows whose `lastSeenAt` is at least {@link expireMs} before
   * {@link now}. Used by list-time cleanup and the presence sweeper.
   *
   * @returns Channel ids that had an online row removed.
   */
  removeExpired(
    tx: TransactionContext,
    now: UnixTimeMs,
    expireMs: number,
  ): Promise<ChannelId[]>;
}
