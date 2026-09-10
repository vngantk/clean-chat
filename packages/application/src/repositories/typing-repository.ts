import type { ChannelId, Typing, UserId } from "@clean-chat/core/domain";
import type { TransactionContext } from "../transaction.js";

/**
 * At most one row per `(channelId, userId)`. Stale rows are filtered in
 * `ListTyping` with {@link Clock} and `TYPING_EXPIRE_MS`.
 */
export interface TypingRepository {
  listByChannel(
    tx: TransactionContext,
    channelId: ChannelId,
  ): Promise<Typing[]>;

  put(tx: TransactionContext, typing: Typing): Promise<void>;

  remove(
    tx: TransactionContext,
    channelId: ChannelId,
    userId: UserId,
  ): Promise<void>;
}
