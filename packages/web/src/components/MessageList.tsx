import { Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ChannelId, UserId } from "@clean-chat/core/domain";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useClient } from "@/lib/client-context";

/**
 * Props for the live message thread.
 */
export interface MessageListProps {
  /** Channel whose messages to subscribe to. */
  channelId: ChannelId;
  /** Signed-in user; used to align "own" bubbles and show delete. */
  viewerId: UserId;
}

/**
 * Scrollable message history for one channel.
 *
 * Subscribes to `message-list-changed` and re-runs `list-messages`.
 *
 * @param props {@link MessageListProps}
 */
export function MessageList({ channelId, viewerId }: MessageListProps) {
  const client = useClient();
  const messages = useLiveQuery(
    () => client.listMessages.execute({ channelId }),
    "message-list-changed",
    channelId,
  );
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-12 w-1/2 self-end" />
        <Skeleton className="h-12 w-3/5" />
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-3 p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No messages yet. Say hello — every signed-in client in this channel
            will update instantly.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.authorId === viewerId;
            return (
              <div
                key={message.id}
                className={`group flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="text-xs font-medium opacity-80">
                      {message.authorName}
                    </span>
                    {mine ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 group-hover:opacity-100"
                        aria-label="Delete message"
                        onClick={() =>
                          void client.deleteOwnMessage.execute({
                            messageId: message.id,
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}
