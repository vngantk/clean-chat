import type {
  Channel,
  Presence,
  Typing,
  User,
} from "@clean-chat/domain";
import type { NewMessage } from "@clean-chat/application";

/**
 * Shared maps for the in-memory persistence adapter.
 *
 * {@link UserRepository} only reads `users`. The in-memory `AuthPort` writes
 * signed-up users here so message joins see display names. Tests may still
 * `store.users.set(id, user)` to seed authors without going through auth.
 */
export type InMemoryStore = {
  channels: Map<string, Channel>;
  messages: Map<string, NewMessage>;
  users: Map<string, User>;
  typing: Map<string, Typing>;
  presence: Map<string, Presence>;
};

export function createInMemoryStore(): InMemoryStore {
  return {
    channels: new Map(),
    messages: new Map(),
    users: new Map(),
    typing: new Map(),
    presence: new Map(),
  };
}

export function typingKey(channelId: string, userId: string): string {
  return `${channelId}\0${userId}`;
}

export function presenceKey(channelId: string, sessionId: string): string {
  return `${channelId}\0${sessionId}`;
}

export function snapshotStore(store: InMemoryStore): InMemoryStore {
  return {
    channels: new Map(store.channels),
    messages: new Map(store.messages),
    users: new Map(store.users),
    typing: new Map(store.typing),
    presence: new Map(store.presence),
  };
}

export function restoreStore(
  store: InMemoryStore,
  snapshot: InMemoryStore,
): void {
  copyMap(store.channels, snapshot.channels);
  copyMap(store.messages, snapshot.messages);
  copyMap(store.users, snapshot.users);
  copyMap(store.typing, snapshot.typing);
  copyMap(store.presence, snapshot.presence);
}

function copyMap<K, V>(target: Map<K, V>, source: Map<K, V>): void {
  target.clear();
  for (const [key, value] of source) {
    target.set(key, value);
  }
}
