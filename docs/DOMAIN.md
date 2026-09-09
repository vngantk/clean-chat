# Domain entities

How `@clean-chat/domain` models [PRODUCT.md](./PRODUCT.md). The source of truth is the TypeBox schemas in `packages/domain/src/`. This document explains the convention and each type.

There are no classes. Runtime validation (`Value.Check`) is not wired yet; the schemas are the contract use cases will check against.

## Schema-first convention

Every concept is a **JSON Schema value** plus a **plain TypeScript type** inferred from it.

```ts
import { Type, type Static } from "@sinclair/typebox";

export const UserIdSchema = Type.String({ minLength: 1 });
export type UserId = Static<typeof UserIdSchema>;
```

Naming:

| Kind | Name | Example |
| --- | --- | --- |
| Schema | `XxxSchema` | `ChannelSchema` |
| Inferred type | `Xxx` | `type Channel = Static<typeof ChannelSchema>` |
| Product error copy | `*_ERROR` | `MESSAGE_EMPTY_ERROR` |
| Numeric / string rule | `*_MAX_LENGTH`, `*_MS` | `MESSAGE_BODY_MAX_LENGTH` |

Object entities set `additionalProperties: false`. Nested fields reuse other schemas (`createdBy: UserIdSchema`) so ids stay one definition.

Package: `@sinclair/typebox` 0.34. Domain may import that library and nothing else (no other workspace packages, no I/O).

## Layout

| Path | Entity / values |
| --- | --- |
| [`packages/domain/src/user/index.ts`](../packages/domain/src/user/index.ts) | `User`, `UserId`, `Email`, `Password`, `DisplayName` |
| [`packages/domain/src/channel/index.ts`](../packages/domain/src/channel/index.ts) | `Channel`, `ChannelId`, `ChannelName` |
| [`packages/domain/src/message/index.ts`](../packages/domain/src/message/index.ts) | `Message`, `MessageId`, `MessageBody` |
| [`packages/domain/src/typing/index.ts`](../packages/domain/src/typing/index.ts) | `Typing` |
| [`packages/domain/src/presence/index.ts`](../packages/domain/src/presence/index.ts) | `Presence`, `SessionId` |
| [`packages/domain/src/unix-time.ts`](../packages/domain/src/unix-time.ts) | `UnixTimeMs` |
| [`packages/domain/src/index.ts`](../packages/domain/src/index.ts) | Public barrel |

## How they relate

```
User.id <──────────────── Channel.createdBy
    │                         │
    │                         │
    ├── Message.authorId      ├── Message.channelId
    ├── Typing.userId         ├── Typing.channelId
    └── Presence.userId       └── Presence.channelId

Presence.sessionId is a tab id, not a User field.
```

Ids are non-empty strings. They are not Convex `_id` / `_creationTime`.

## User

Signed-in account as the rest of the app sees it. **Password hashes are not on this entity.**

```ts
export const UserSchema = Type.Object(
  {
    id: UserIdSchema,
    email: EmailSchema,
    name: DisplayNameSchema,
  },
  { additionalProperties: false },
);

export type User = Static<typeof UserSchema>;
// { id: string; email: string; name: string }
```

| Field | Schema | Meaning |
| --- | --- | --- |
| `id` | `UserIdSchema` | Stable unique id |
| `email` | `EmailSchema` | Identifies the account (`minLength: 1`) |
| `name` | `DisplayNameSchema` | Trimmed display name, non-empty |

Related value objects (same file, not fields of `User`):

| Schema | Rule | Notes |
| --- | --- | --- |
| `PasswordSchema` | `minLength: 8` (`PASSWORD_MIN_LENGTH`) | Plaintext only. Hashing is infrastructure. |
| `DisplayNameSchema` | `minLength: 1` | After `trimDisplayName` |

## Channel

Shared room. Not private. `name` is intended unique.

```ts
export const ChannelSchema = Type.Object(
  {
    id: ChannelIdSchema,
    name: ChannelNameSchema,
    createdBy: UserIdSchema,
  },
  { additionalProperties: false },
);
```

| Field | Schema | Meaning |
| --- | --- | --- |
| `id` | `ChannelIdSchema` | Stable unique id |
| `name` | `ChannelNameSchema` | Slug after normalize |
| `createdBy` | `UserIdSchema` | Creator |

`ChannelNameSchema` is the **stored** slug, not the raw form input:

- `minLength: 1`, `maxLength: 32` (`CHANNEL_NAME_MAX_LENGTH`)
- `pattern: '^[a-z0-9-]+$'` (`CHANNEL_NAME_PATTERN`)

Create path in a later use case: `normalizeChannelName(raw)` then match `ChannelNameSchema`.

```ts
export function normalizeChannelName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}
```

`GENERAL_CHANNEL_NAME` is `"general"`. `compareChannels` puts that name first, then alphabetical.

Product error strings (for the use case to throw, not encoded in TypeBox `message`):

- `CHANNEL_NAME_LENGTH_ERROR` — `Channel names must be 1–32 characters.`
- `CHANNEL_NAME_PATTERN_ERROR` — `Use letters, numbers, and hyphens only.`

## Message

Chat line in a channel. `authorName` is a read-time join (or denormalized copy), not a second user table in this type.

```ts
export const MessageSchema = Type.Object(
  {
    id: MessageIdSchema,
    channelId: ChannelIdSchema,
    authorId: UserIdSchema,
    body: MessageBodySchema,
    authorName: DisplayNameSchema,
    createdAt: UnixTimeMsSchema,
  },
  { additionalProperties: false },
);
```

| Field | Schema | Meaning |
| --- | --- | --- |
| `id` | `MessageIdSchema` | Stable unique id |
| `channelId` | `ChannelIdSchema` | Parent room |
| `authorId` | `UserIdSchema` | Sender |
| `body` | `MessageBodySchema` | Trimmed text, 1–2000 chars |
| `authorName` | `DisplayNameSchema` | `"Unknown"` if the user is gone (`UNKNOWN_AUTHOR_NAME`) |
| `createdAt` | `UnixTimeMsSchema` | Ordering only |

`trimMessageBody` is the input step before `MessageBodySchema`. List window `MESSAGE_LIST_LIMIT` is `50` (latest, oldest first — a use-case rule that lives next to the entity).

Product error strings:

- `MESSAGE_EMPTY_ERROR` — `Message cannot be empty.`
- `MESSAGE_TOO_LONG_ERROR` — `Message is too long.`
- `CHANNEL_NOT_FOUND_ERROR` — `Channel not found.`
- `MESSAGE_DELETE_FORBIDDEN_ERROR` — `You can only delete your own messages.`

## Typing

At most one record per `(channelId, userId)`. No separate id field.

```ts
export const TypingSchema = Type.Object(
  {
    channelId: ChannelIdSchema,
    userId: UserIdSchema,
    name: DisplayNameSchema,
    updatedAt: UnixTimeMsSchema,
  },
  { additionalProperties: false },
);
```

| Field | Meaning |
| --- | --- |
| `channelId` | Channel being typed in |
| `userId` | Who is typing |
| `name` | Display name for the typing line (joined at read) |
| `updatedAt` | Last upsert; expire if older than `TYPING_EXPIRE_MS` (3000) |

`TYPING_DEBOUNCE_MS` is `300` (client). Expiry and debounce are constants, not schema constraints.

## Presence

Who is in a channel, per user **and** tab.

```ts
export const PresenceSchema = Type.Object(
  {
    channelId: ChannelIdSchema,
    userId: UserIdSchema,
    sessionId: SessionIdSchema,
    online: Type.Boolean(),
    name: DisplayNameSchema,
  },
  { additionalProperties: false },
);
```

| Field | Meaning |
| --- | --- |
| `channelId` | Room |
| `userId` | Who |
| `sessionId` | Tab / session so two windows are distinct |
| `online` | What the facepile shows; heartbeats must not rewrite identity every tick |
| `name` | Display name for avatars |

`PRESENCE_FACEPILE_LIMIT` is `5` (UI overflow after that).

## Unix time

```ts
export const UnixTimeMsSchema = Type.Integer({ minimum: 0 });
export type UnixTimeMs = Static<typeof UnixTimeMsSchema>;
```

Used by `Message.createdAt` and `Typing.updatedAt`. Not a display format.

## What is not in these types

- Password hashes, sessions, JWT
- Convex `_id` / `_creationTime`
- Live-subscription or repository ports (those belong in use cases)
- UI copy for the typing line (`{name} is typing…`) — format in application/presentation
