import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import type { ChannelId } from "@clean-chat/core/domain";
import { ChannelList } from "@/components/ChannelList";
import { MessageInput } from "@/components/MessageInput";
import { MessageList } from "@/components/MessageList";
import { PresencePile } from "@/components/PresencePile";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useClient } from "@/lib/client-context";
import { useSession } from "@/lib/session";

/**
 * Signed-in shell: channel sidebar + live thread.
 *
 * Query use cases return `undefined` while the first result is in flight
 * (hence skeletons), then a live value that updates when matching events
 * are published.
 */
export function ChatApp() {
  const client = useClient();
  const { viewer, setViewer } = useSession();
  const channels = useLiveQuery(
    () => client.listChannels.execute(),
    "channel-list-changed",
  );
  const [channelId, setChannelId] = useState<ChannelId | null>(null);
  const selectedId = channelId ?? channels?.[0]?.id ?? null;

  useEffect(() => {
    void client.ensureGeneralChannel.execute();
  }, [client]);

  const selected = channels?.find((channel) => channel.id === selectedId);

  if (viewer === null || viewer === undefined) {
    return null;
  }

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-64 shrink-0 flex-col bg-zinc-950 text-zinc-100">
        <div className="border-b border-zinc-800 px-4 py-4">
          <p className="text-sm font-semibold tracking-tight">Clean Chat</p>
          <p className="text-xs text-zinc-400">Realtime rooms</p>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {channels === undefined ? (
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-8 w-full bg-zinc-800" />
              <Skeleton className="h-8 w-3/4 bg-zinc-800" />
            </div>
          ) : (
            <ChannelList
              channels={channels}
              selectedId={selectedId}
              onSelect={setChannelId}
            />
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-zinc-800 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {viewer.name}
            </p>
            <p className="truncate text-xs text-zinc-400">{viewer.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-zinc-300 hover:bg-zinc-800 hover:text-white"
            onClick={() => {
              void (async () => {
                await client.signOut.execute();
                setViewer(null);
              })();
            }}
            aria-label="Sign out"
          >
            <LogOut />
          </Button>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col bg-background">
        {selected ? (
          <>
            <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <h1 className="text-sm font-semibold">#{selected.name}</h1>
                <p className="text-xs text-muted-foreground">
                  Messages sync live for everyone in this channel.
                </p>
              </div>
              <PresencePile channelId={selected.id} />
            </header>
            <MessageList
              channelId={selected.id}
              viewerId={viewer.id}
            />
            <TypingIndicator
              channelId={selected.id}
              viewerId={viewer.id}
            />
            <MessageInput channelId={selected.id} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading channel…
          </div>
        )}
      </main>
    </div>
  );
}
