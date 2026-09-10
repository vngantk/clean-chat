import {
  PRESENCE_FACEPILE_LIMIT,
  type ChannelId,
  type Presence,
} from "@clean-chat/core/domain";
import { usePresence } from "@/hooks/use-presence";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";

/**
 * Props for the online-avatar stack in the channel header.
 */
export interface PresencePileProps {
  /** Channel id, used as the presence room. */
  channelId: ChannelId;
}

function uniqueOnlineUsers(rows: Presence[]): Presence[] {
  const seen = new Set<string>();
  const online: Presence[] = [];
  for (const entry of rows) {
    if (!entry.online || seen.has(entry.userId)) {
      continue;
    }
    seen.add(entry.userId);
    online.push(entry);
  }
  return online;
}

/**
 * Initials for an avatar fallback (up to two words).
 *
 * @param name Display name from the user.
 * @returns Uppercase initials, e.g. `"Ada Lovelace"` → `"AL"`.
 */
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Who is online in this channel.
 *
 * Heartbeats through `heartbeat-presence` and lists members via
 * `list-presence`. Avatars update when people join/leave, not on every
 * heartbeat.
 *
 * @param props {@link PresencePileProps}
 */
export function PresencePile({ channelId }: PresencePileProps) {
  const presenceState = usePresence(channelId);
  const online = uniqueOnlineUsers(presenceState ?? []);
  const visible = online.slice(0, PRESENCE_FACEPILE_LIMIT);
  const extra = online.length - visible.length;

  if (presenceState === undefined) {
    return (
      <p className="text-xs text-muted-foreground">Checking who’s here…</p>
    );
  }

  if (online.length === 0) {
    return <p className="text-xs text-muted-foreground">Nobody else here</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <AvatarGroup>
        {visible.map((entry) => (
          <Avatar key={entry.userId} size="sm" title={entry.name}>
            <AvatarFallback>{initials(entry.name)}</AvatarFallback>
          </Avatar>
        ))}
        {extra > 0 ? <AvatarGroupCount>+{extra}</AvatarGroupCount> : null}
      </AvatarGroup>
      <span className="text-xs text-muted-foreground">
        {online.length} online
      </span>
    </div>
  );
}
