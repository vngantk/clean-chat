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
import { cancelPendingPresenceDisconnects } from "@/hooks/use-presence";
import { useClient } from "@/lib/client-context";
import { errorMessage } from "@/lib/error-message";
import { useSession } from "@/lib/session";
import { tabSessionId } from "@/lib/session-id";

/**
 * Signed-in shell: channel sidebar + live thread.
 *
 * Query use cases return `loading` while the first result is in flight
 * (hence skeletons), then a live value that updates when matching events
 * are published.
 */
export function ChatApp() {
  const client = useClient();
  const { viewer, setViewer } = useSession();
  const channelsQuery = useLiveQuery(
    () => client.listChannels.execute(),
    "channel-list-changed",
  );
  const channels = channelsQuery.data;
  const [channelId, setChannelId] = useState<ChannelId | null>(null);
  const [ensureError, setEnsureError] = useState<string | undefined>(
    undefined,
  );
  const selectedId = channelId ?? channels?.[0]?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    void client.ensureGeneralChannel.execute().then(
      () => {
        if (!cancelled) {
          setEnsureError(undefined);
        }
      },
      (err: unknown) => {
        if (!cancelled) {
          setEnsureError(errorMessage(err, "Could not create #general."));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [client]);

  const selected = channels?.find((channel) => channel.id === selectedId);

  if (viewer === null || viewer === undefined) {
    return null;
  }

  async function signOut() {
    cancelPendingPresenceDisconnects();
    if (selectedId !== null) {
      try {
        await client.disconnectPresence.execute({
          channelId: selectedId,
          sessionId: tabSessionId(),
        });
      } catch {
        // Still sign out if disconnect fails (offline, already gone).
      }
    }
    try {
      await client.signOut.execute();
    } finally {
      setViewer(null);
    }
  }

  const channelsLoading = channelsQuery.status === "loading";
  const channelsFailed =
    channelsQuery.status === "error" && channels === undefined;
  const channelsEmpty = channels !== undefined && channels.length === 0;

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-64 shrink-0 flex-col bg-zinc-950 text-zinc-100">
        <div className="border-b border-zinc-800 px-4 py-4">
          <p className="text-sm font-semibold tracking-tight">Clean Chat</p>
          <p className="text-xs text-zinc-400">Realtime rooms</p>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {channelsLoading ? (
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-8 w-full bg-zinc-800" />
              <Skeleton className="h-8 w-3/4 bg-zinc-800" />
            </div>
          ) : channelsFailed ? (
            <div className="flex flex-col gap-2 p-3 text-sm text-zinc-400">
              <p>{channelsQuery.error ?? "Could not load channels."}</p>
              <Button
                variant="ghost"
                size="sm"
                className="self-start text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={() => channelsQuery.retry()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <ChannelList
              channels={channels ?? []}
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
              void signOut();
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
            {channelsQuery.status === "error" && channels !== undefined ? (
              <p className="border-b px-4 py-2 text-xs text-destructive">
                {channelsQuery.error}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => channelsQuery.retry()}
                >
                  Retry
                </button>
              </p>
            ) : null}
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
        ) : channelsLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading channel…
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
            <p>
              {channelsFailed
                ? (channelsQuery.error ?? "Could not load channels.")
                : channelsEmpty
                  ? (ensureError ?? "No channels yet.")
                  : "Select a channel."}
            </p>
            {channelsFailed ? (
              <Button variant="outline" size="sm" onClick={() => channelsQuery.retry()}>
                Retry
              </Button>
            ) : null}
            {channelsEmpty && ensureError ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void client.ensureGeneralChannel.execute().then(
                    () => {
                      setEnsureError(undefined);
                      channelsQuery.retry();
                    },
                    (err: unknown) => {
                      setEnsureError(
                        errorMessage(err, "Could not create #general."),
                      );
                    },
                  );
                }}
              >
                Retry
              </Button>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
