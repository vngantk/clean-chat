import { Hash, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Channel, ChannelId } from "@clean-chat/core/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useClient } from "@/lib/client-context";

/**
 * Props for the sidebar channel list.
 */
export interface ChannelListProps {
  /** Live channels from `list-channels`. */
  channels: Channel[];
  /** Currently open channel, or `null` before the first selection. */
  selectedId: ChannelId | null;
  /** Called when the user clicks a channel or creates a new one. */
  onSelect: (id: ChannelId) => void;
}

/**
 * Sidebar: pick a channel and create new ones.
 *
 * @param props {@link ChannelListProps}
 */
export function ChannelList({
  channels,
  selectedId,
  onSelect,
}: ChannelListProps) {
  const client = useClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a channel via `create-channel`, then select it.
   *
   * @param event Form submit from the new-channel field.
   */
  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const id = await client.createChannel.execute({ name });
      setName("");
      onSelect(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create channel.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-0.5 p-2">
          {channels.map((channel) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => onSelect(channel.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                selectedId === channel.id
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-300 hover:bg-zinc-900 hover:text-white",
              )}
            >
              <Hash className="size-3.5 shrink-0 opacity-70" />
              <span className="truncate">{channel.name}</span>
            </button>
          ))}
        </nav>
      </ScrollArea>
      <form
        onSubmit={(event) => void onCreate(event)}
        className="flex flex-col gap-2 border-t border-zinc-800 p-3"
      >
        <div className="flex gap-1.5">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="new-channel"
            className="border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
          />
          <Button type="submit" size="icon" disabled={!name.trim()}>
            <Plus />
          </Button>
        </div>
        {error ? <p className="text-xs text-red-300">{error}</p> : null}
      </form>
    </div>
  );
}
