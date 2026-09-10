import type {
  Channel,
  Message,
  Presence,
  Typing,
  User,
} from "@clean-chat/core/domain";
import { vi } from "vitest";
import type { AuthPort } from "../src/auth.js";
import type { Clock } from "../src/clock.js";
import type { EventPublisher } from "../src/event-publisher.js";
import type { IdGenerator } from "../src/id-generator.js";
import type { ChannelRepository } from "../src/repositories/channel-repository.js";
import type { MessageRepository } from "../src/repositories/message-repository.js";
import type { PresenceRepository } from "../src/repositories/presence-repository.js";
import type { TypingRepository } from "../src/repositories/typing-repository.js";
import type { TransactionContext, UnitOfWork } from "../src/transaction.js";

export const tx = {} as TransactionContext;

export const user: User = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada",
};

export const general: Channel = {
  id: "ch-general",
  name: "general",
  createdBy: user.id,
};

export function mockAuth(current: User | null = user): AuthPort {
  return {
    currentUser: vi.fn(async () => current),
    signUp: vi.fn(async () => user),
    signIn: vi.fn(async () => user),
    signOut: vi.fn(async () => undefined),
  };
}

export function mockUow(): UnitOfWork {
  return {
    run: vi.fn(async (work) => work(tx)),
  };
}

export function mockEvents(): EventPublisher {
  return {
    publish: vi.fn(async () => undefined),
  };
}

export function mockIds(id = "new-id"): IdGenerator {
  return {
    next: vi.fn(() => id),
  };
}

export function mockClock(now = 1_000_000): Clock {
  return {
    now: vi.fn(() => now),
  };
}

export function mockChannels(
  overrides: Partial<ChannelRepository> = {},
): ChannelRepository {
  return {
    list: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    getByName: vi.fn(async () => null),
    insert: vi.fn(async () => undefined),
    ...overrides,
  };
}

export function mockMessages(
  overrides: Partial<MessageRepository> = {},
): MessageRepository {
  return {
    listLatestByChannel: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    insert: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    ...overrides,
  };
}

export function mockTyping(
  overrides: Partial<TypingRepository> = {},
): TypingRepository {
  return {
    listByChannel: vi.fn(async () => []),
    put: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    ...overrides,
  };
}

export function mockPresence(
  overrides: Partial<PresenceRepository> = {},
): PresenceRepository {
  return {
    listByChannel: vi.fn(async () => []),
    get: vi.fn(async () => null),
    put: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    ...overrides,
  };
}

export function aMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    channelId: "ch-1",
    authorId: user.id,
    body: "hello",
    authorName: user.name,
    createdAt: 1,
    ...overrides,
  };
}

export function aTyping(overrides: Partial<Typing> = {}): Typing {
  return {
    channelId: "ch-1",
    userId: user.id,
    name: user.name,
    updatedAt: 1_000_000,
    ...overrides,
  };
}

export function aPresence(overrides: Partial<Presence> = {}): Presence {
  return {
    channelId: "ch-1",
    userId: user.id,
    sessionId: "sess-1",
    online: true,
    name: user.name,
    ...overrides,
  };
}
