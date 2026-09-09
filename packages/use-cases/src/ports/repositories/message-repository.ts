import { Type, type Static } from "@sinclair/typebox";
import {
  ChannelIdSchema,
  MessageBodySchema,
  MessageIdSchema,
  UnixTimeMsSchema,
  UserIdSchema,
  type ChannelId,
  type Message,
  type MessageId,
} from "@clean-chat/domain";
import type { TransactionContext } from "../transaction.js";

/**
 * Row to insert. `authorName` is joined at read time in {@link listLatestByChannel}.
 */
export const NewMessageSchema = Type.Object(
  {
    id: MessageIdSchema,
    channelId: ChannelIdSchema,
    authorId: UserIdSchema,
    body: MessageBodySchema,
    createdAt: UnixTimeMsSchema,
  },
  { additionalProperties: false },
);

export type NewMessage = Static<typeof NewMessageSchema>;

export interface MessageRepository {
  /**
   * Latest `limit` messages, oldest first, with `authorName`
   * (`"Unknown"` if the user is gone).
   */
  listLatestByChannel(
    tx: TransactionContext,
    channelId: ChannelId,
    limit: number,
  ): Promise<Message[]>;

  getById(tx: TransactionContext, id: MessageId): Promise<Message | null>;

  insert(tx: TransactionContext, record: NewMessage): Promise<void>;

  remove(tx: TransactionContext, id: MessageId): Promise<void>;
}
