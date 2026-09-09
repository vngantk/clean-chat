import type {
  Channel,
  ChannelId,
  ChannelName,
} from "@clean-chat/domain";
import type { TransactionContext } from "../transaction.js";

/**
 * Shared rooms. `list` is unsorted; `ListChannels` applies `compareChannels`.
 * Caller supplies `id` via {@link IdGenerator} before {@link insert}.
 */
export interface ChannelRepository {
  list(tx: TransactionContext): Promise<Channel[]>;

  getById(tx: TransactionContext, id: ChannelId): Promise<Channel | null>;

  getByName(
    tx: TransactionContext,
    name: ChannelName,
  ): Promise<Channel | null>;

  insert(tx: TransactionContext, channel: Channel): Promise<void>;
}
