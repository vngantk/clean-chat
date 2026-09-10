# Product specification

Stack-agnostic description of **what this app does**. A reimplementation on another technology stack should match this document, not Convex APIs.

This repo is a learning demo of a small Slack-style realtime chat. It is not a production messenger.

## Purpose

Let two or more signed-in people share **named channels**, send **text messages** that appear for everyone immediately, see **who is online** in the current channel, and see **who is typing**.

## Users and accounts

| Field | Rules |
| --- | --- |
| Email | Required. Identifies the account. |
| Password | Required. At least **8 characters**. Hashed at rest. |
| Display name | Required **on sign-up only**. Trimmed; cannot be empty. Shown on messages, typing, presence, and the sidebar. |

There is **no** email verification, magic link, OAuth, or password-reset flow.

Sign-in and sign-up are the same form, toggled by a `flow` of `signIn` or `signUp`. Sign-up also collects `name`.

**Authorization:** any signed-in user can read all channels and all messages, create channels, and send messages. A user may delete **only their own** messages. Signed-out users see only the auth screen.

## Screens

### 1. Loading

Full-viewport message: session still resolving (this port may say `Loading session…`).

### 2. Signed out — auth card

Centered card titled **Clean Chat**.

- Sign-in: Email, Password, primary **Sign in**, ghost **Need an account? Sign up**
- Sign-up: Display name, Email, Password, primary **Create account**, ghost **Already have an account? Sign in**
- Failed auth shows the error string under the fields

### 3. Signed in — two-pane chat

No client-side URL router. The open channel is UI state.

**Left sidebar (dark, ~16rem):**

- Header: **Clean Chat** / subtitle **Realtime rooms**
- Scrollable channel list (`#` + slug). Active channel is highlighted
- Create-channel row: text field placeholder `new-channel` + plus button
- Footer: display name, email, sign-out icon

**Main pane:**

- Header: `#channel-slug`, helper line, online facepile + `"N online"`
- Scrollable message list (skeletons while the first load is in flight)
- Fixed-height typing line (empty spacer when nobody else is typing)
- Composer: text field `Message this channel` + **Send**

If channels have not arrived yet: **Loading channel…**

## Domain

### Channel

Shared room. Not private. No membership list — every signed-in user sees every channel.

| Field | Meaning |
| --- | --- |
| id | Stable unique id |
| name | Slug, intended unique |
| createdBy | User id of the creator |

**`general`** is created on first chat-shell mount if missing. Channel list order: `general` first, then alphabetical by `name`.

**Create rules:** trim, lowercase, whitespace → `-`. Then must match `^[a-z0-9-]+$` and length 1–32. If a channel with that slug exists, return it (idempotent). Errors:

- `Channel names must be 1–32 characters.`
- `Use letters, numbers, and hyphens only.`

### Message

| Field | Meaning |
| --- | --- |
| id | Stable unique id |
| channelId | Parent channel |
| authorId | Sender |
| body | Trimmed text |
| authorName | Denormalized or joined at read time; `"Unknown"` if the user is gone |
| createdAt | Used only for ordering |

**List:** latest **50** messages in the channel, **oldest first**.

**Send:** body trimmed, non-empty, max **2000** characters; channel must exist. Errors: `Message cannot be empty.`, `Message is too long.`, `Channel not found.`

**Delete:** author only. Missing message is a no-op. Wrong author: `You can only delete your own messages.`

Own messages: right-aligned primary bubble, hover trash. Others: left-aligned muted bubble. Empty thread copy:

> No messages yet. Say hello — every signed-in client in this channel will update instantly.

### Presence (who is in this channel)

Per **channel** (room), per **user**, with a **session/tab** so two tabs can be distinguished internally. A tab is online only in the channel it currently has open.

Show users with `online === true`: up to 5 avatars (initials from display name), `+N` overflow, and `"N online"`. Loading: `Checking who's here…`. None: `Nobody else here`.

Updates when people **join or leave** the channel. Heartbeats must **not** redraw the list on every tick.

Closing a tab should drop presence reasonably quickly.

### Typing

At most one typing record per `(channelId, userId)`.

- Client: debounce **300ms** after keystrokes, then upsert
- Clear immediately on send, blur, or unmount
- Server: expire if not refreshed for **3 seconds**

UI copy (exclude the current user):

- 1 other: `{name} is typing…`
- 2 others: `{name1} and {name2} are typing…`
- 3+: `{name1} and {n} others are typing…`

Reserve ~1.5rem of height even when idle so the composer does not jump.

## Realtime requirements (must match)

Two browsers, two accounts, same channel:

1. A sent message appears in the other window **without refresh**
2. A deleted own message disappears for everyone
3. A new channel appears in every signed-in sidebar
4. Presence count/avatars update when someone opens or leaves the channel
5. Typing appears for others and clears after send, blur, or ~3s idle

Do **not** require the client to poll. Push or live subscriptions are the intended model.

## Explicitly out of scope

Direct messages, invites, roles, unread badges, pagination beyond 50, attachments, reactions, message edit, markdown, search, email verification, password reset, OAuth, mobile apps, a public REST API.

## Acceptance checks

1. Sign up user A and user B (private window).
2. Both land in `#general`.
3. A sends a message; B sees it live. B replies; A sees it live.
4. A deletes A’s message; B’s thread updates.
5. A creates `team-chat`; B’s sidebar lists it; both can open it.
6. Invalid channel `Hi!` or a 33-character slug is rejected.
7. Empty send is ignored/disabled; oversize body is rejected.
8. B types; A sees a typing line; B stops; line clears within ~3s.
9. Sign out returns to the auth card.
