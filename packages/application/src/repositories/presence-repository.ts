import type {
  ChannelId,
  Presence,
  SessionId,
} from "@clean-chat/core/domain";
import type { TransactionContext } from "../transaction.js";

/**
 * One row per `(channelId, sessionId)`. Heartbeat/disconnect compare previous
 * vs new inside `UnitOfWork.run`, then publish after commit if membership changed.
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
}
