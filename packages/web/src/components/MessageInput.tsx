import { Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { TYPING_DEBOUNCE_MS, type ChannelId } from "@clean-chat/core/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClient } from "@/lib/client-context";

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
 * unmount call `clear-typing`.
 *
 * @param props {@link MessageInputProps}
 */
export function MessageInput({ channelId }: MessageInputProps) {
  const client = useClient();
  const [body, setBody] = useState("");
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
   * Send the current draft and clear the typing row.
   *
   * @param event Form submit from the composer.
   */
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text) {
      return;
    }
    setBody("");
    window.clearTimeout(timeoutRef.current);
    await Promise.all([
      client.sendMessage.execute({ channelId, body: text }),
      client.clearTyping.execute({ channelId }),
    ]);
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex gap-2 border-t p-3"
    >
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
      />
      <Button type="submit" disabled={!body.trim()}>
        <Send />
        Send
      </Button>
    </form>
  );
}
