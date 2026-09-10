import { Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { TYPING_DEBOUNCE_MS, type ChannelId } from "@clean-chat/core/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClient } from "@/lib/client-context";
import { errorMessage } from "@/lib/error-message";

/**
 * Props for the composer at the bottom of a channel.
 */
export interface MessageInputProps {
  /** Channel that new messages and typing events go to. */
  channelId: ChannelId;
}

/**
 * Message composer with debounced typing indicators.
 *
 * Typing is not sent on every keystroke: {@link scheduleTyping} waits
 * {@link TYPING_DEBOUNCE_MS}, then calls `upsert-typing`. Send / blur /
 * unmount call `clear-typing`. The draft stays until send succeeds.
 *
 * @param props {@link MessageInputProps}
 */
export function MessageInput({ channelId }: MessageInputProps) {
  const client = useClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      window.clearTimeout(timeoutRef.current);
      void client.clearTyping.execute({ channelId });
    };
  }, [channelId, client]);

  /**
   * Debounce typing upserts so we do not write on every key.
   */
  function scheduleTyping() {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      void client.upsertTyping.execute({ channelId });
    }, TYPING_DEBOUNCE_MS);
  }

  /**
   * Send the current draft after the server accepts it, then clear typing.
   *
   * @param event Form submit from the composer.
   */
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || sending) {
      return;
    }
    setSending(true);
    setError(undefined);
    try {
      await client.sendMessage.execute({ channelId, body: text });
      setBody("");
      window.clearTimeout(timeoutRef.current);
      await client.clearTyping.execute({ channelId });
    } catch (err) {
      setError(errorMessage(err, "Could not send message."));
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-2 border-t p-3"
    >
      <div className="flex gap-2">
        <Input
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            scheduleTyping();
          }}
          onBlur={() => {
            window.clearTimeout(timeoutRef.current);
            void client.clearTyping.execute({ channelId });
          }}
          placeholder="Message this channel"
          autoComplete="off"
          disabled={sending}
        />
        <Button type="submit" disabled={!body.trim() || sending}>
          <Send />
          Send
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
    </form>
  );
}
