import type { ChannelId, UserId } from "@clean-chat/core/domain";
import { useFreshTyping } from "@/hooks/use-fresh-typing";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useClient } from "@/lib/client-context";

/**
 * Props for the "X is typing…" line under the thread.
 */
export interface TypingIndicatorProps {
  /** Channel whose typing rows to subscribe to. */
  channelId: ChannelId;
  /** Current user; excluded from the label. */
  viewerId: UserId;
}

/**
 * Live typing label for other users in this channel.
 *
 * Subscribes to `typing-changed` and re-runs `list-typing`. Stale rows
 * (older than 3s) are hidden locally so the line clears without a new event.
 *
 * @param props {@link TypingIndicatorProps}
 */
export function TypingIndicator({
  channelId,
  viewerId,
}: TypingIndicatorProps) {
  const client = useClient();
  const query = useLiveQuery(
    () => client.listTyping.execute({ channelId }),
    "typing-changed",
    channelId,
  );
  const others = useFreshTyping(query.data, viewerId);

  if (others.length === 0) {
    return <div className="h-6 px-4" />;
  }

  const names = others.map((entry) => entry.name);
  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing…`
        : `${names[0]} and ${names.length - 1} others are typing…`;

  return (
    <p className="h-6 px-4 text-xs text-muted-foreground italic">{label}</p>
  );
}
