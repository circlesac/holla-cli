# holla-cli — Implementation Plan

> Feature-complete Slack CLI (with future multi-platform support)

## Overview

`holla` is a CLI tool that acts as **you** on messaging platforms. Every action (sending messages, reacting, joining channels) is performed as the authenticated user, not as a bot. The first platform is **Slack**. The architecture supports adding more platforms (e.g., Discord, Teams) later via `holla <provider> <command> <action>` pattern.

**Hybrid approach**: Ergonomic commands for common operations + raw API passthrough for everything else.

```
holla <provider> <command> <action> [--flag value ...]
  │       │         │        │        └── all named flags (no positional args)
  │       │         │        └── verb (send, list, edit, add, ...)
  │       │         └── namespace (chat, channels, users, files, ...)
  │       └── platform (slack, discord, ...)
  └── binary
```

```bash
# Ergonomic commands (human-friendly names, all named flags)
holla slack chat send --channel #general --message "Hello!"
holla slack channels list
holla slack channels history --channel #general --limit 20
holla slack users list
holla slack files upload --channel #general --file ./report.pdf

# Raw API passthrough (any Slack method, like `gh api`)
holla slack api conversations.requestSharedInvite.approve --invite-id I123
holla slack api chat.scheduledMessages.list
holla slack api files.remote.add --external-id X --title "Report"
```

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | **Bun** | Company standard, fast, built-in TypeScript |
| Language | **TypeScript** | Company standard, strict mode |
| CLI Framework | **citty** | Used in shh-env, lightweight, TypeScript-first |
| Slack SDK | **@slack/web-api** | Official SDK (per API integration guide: always prefer official SDKs) |
| Markdown to Blocks | **@circlesac/mack** | Convert Markdown to Slack Block Kit via `markdownToBlocks` |
| Testing | **vitest** | Company standard (see testing guide) |
| Build | **bun build --compile** | Standalone binary distribution |

## Architecture

### Command Tree

```
holla
├── slack                              # Slack provider
│   ├── auth
│   │   ├── login                      # Authenticate (OAuth or paste token)
│   │   ├── logout                     # Remove stored credentials
│   │   └── status                     # → auth.test
│   ├── channels                       # → conversations.*
│   │   ├── list                       # → conversations.list
│   │   ├── info                       # → conversations.info
│   │   ├── create                     # → conversations.create
│   │   ├── archive                    # → conversations.archive
│   │   ├── unarchive                  # → conversations.unarchive
│   │   ├── join                       # → conversations.join
│   │   ├── leave                      # → conversations.leave
│   │   ├── invite                     # → conversations.invite
│   │   ├── kick                       # → conversations.kick
│   │   ├── members                    # → conversations.members
│   │   ├── history                    # → conversations.history
│   │   ├── replies                    # → conversations.replies
│   │   ├── mark-read                  # → conversations.mark
│   │   ├── topic                      # → conversations.setTopic
│   │   └── purpose                    # → conversations.setPurpose
│   ├── chat
│   │   ├── send                       # → chat.postMessage (markdown → blocks)
│   │   ├── whisper                    # → chat.postEphemeral
│   │   ├── edit                       # → chat.update
│   │   ├── delete                     # → chat.delete
│   │   ├── permalink                  # → chat.getPermalink
│   │   ├── schedule                   # → chat.scheduleMessage
│   │   └── unfurl                     # → chat.unfurl
│   ├── reactions
│   │   ├── add                        # → reactions.add
│   │   ├── remove                     # → reactions.remove
│   │   ├── get                        # → reactions.get
│   │   └── list                       # → reactions.list
│   ├── search
│   │   ├── all                        # → search.all
│   │   ├── messages                   # → search.messages
│   │   └── files                      # → search.files
│   ├── users
│   │   ├── list                       # → users.list
│   │   ├── info                       # → users.info
│   │   ├── find                       # → users.lookupByEmail
│   │   ├── presence                   # → users.getPresence
│   │   ├── set-presence               # → users.setPresence
│   │   ├── profile                    # → users.profile.get
│   │   └── set-profile                # → users.profile.set
│   ├── files
│   │   ├── upload                     # → files.upload
│   │   ├── list                       # → files.list
│   │   ├── info                       # → files.info
│   │   └── delete                     # → files.delete
│   ├── pins
│   │   ├── add                        # → pins.add
│   │   ├── list                       # → pins.list
│   │   └── remove                     # → pins.remove
│   ├── stars
│   │   ├── add                        # → stars.add
│   │   ├── list                       # → stars.list
│   │   └── remove                     # → stars.remove
│   ├── bookmarks
│   │   ├── add                        # → bookmarks.add
│   │   ├── edit                       # → bookmarks.edit
│   │   ├── list                       # → bookmarks.list
│   │   └── remove                     # → bookmarks.remove
│   ├── reminders
│   │   ├── add                        # → reminders.add
│   │   ├── list                       # → reminders.list
│   │   ├── info                       # → reminders.info
│   │   ├── complete                   # → reminders.complete
│   │   └── delete                     # → reminders.delete
│   ├── dnd
│   │   ├── status                     # → dnd.info
│   │   ├── snooze                     # → dnd.setSnooze
│   │   ├── unsnooze                   # → dnd.endSnooze
│   │   ├── end                        # → dnd.endDnd
│   │   └── team                       # → dnd.teamInfo
│   ├── groups                         # → usergroups.*
│   │   ├── create                     # → usergroups.create
│   │   ├── list                       # → usergroups.list
│   │   ├── update                     # → usergroups.update
│   │   ├── enable                     # → usergroups.enable
│   │   ├── disable                    # → usergroups.disable
│   │   ├── members                    # → usergroups.users.list
│   │   └── set-members                # → usergroups.users.update
│   ├── emoji
│   │   └── list                       # → emoji.list
│   ├── team
│   │   ├── info                       # → team.info
│   │   └── profile                    # → team.profile.get
│   ├── api                            # Raw API passthrough (any Slack method)
│   └── version                        # Show Slack connection info
└── version                            # Show holla-cli version
```

### Key Design Decisions

#### 1. User-token-first architecture

holla-cli acts as **you**, not as a bot. All commands use the user token (`xoxp-`). The bot token exists only because Slack OAuth v2 requires a bot_user for app installation, but it is never used for API calls.

This means:
- Messages you send appear as **your name and avatar**, not "holla-cli"
- Reactions, pins, channel joins — all attributed to you
- Search, stars, DND, profile — only possible with user tokens anyway
- One token to manage, simpler credential model

**Bot scopes are minimal** — just enough for the app to install. All real scopes are on the user side.

#### 2. Strict 3-level routing

citty routes exactly 3 levels: `<provider>` → `<command>` → `<action>`. Everything after `<action>` is named flags. No positional arguments, no deeper nesting.

#### 3. Hybrid command model

- **Ergonomic commands**: Human-friendly names, kebab-case, all named flags, formatted output
- **Raw API passthrough** (`holla slack api <method>`): Any Slack method with `--key value` flags, always returns raw JSON
- Ergonomic commands are added incrementally; `api` gives 100% coverage from day one

#### 4. Authentication strategy

Three ways to authenticate, in order of preference:

**A. OAuth flow (default)** — one command, gets the user token:
```
holla slack auth login
> Opening browser for Slack authorization...
> Waiting for callback on http://localhost:9876/callback...
✓ Authorized! Tokens saved for "Circles Inc" (T01234567)
```

Flow:
1. CLI starts local HTTP server on port 9876
2. Opens browser to `https://slack.com/oauth/v2/authorize` with `user_scope` (all needed scopes)
3. User clicks "Allow"
4. Slack redirects to `localhost:9876/callback?code=XXX`
5. CLI exchanges code for tokens via `oauth.v2.access`
6. User token (`xoxp-`) extracted from `authed_user.access_token` and stored

Ships with a Circles-owned Slack app (client_id/secret baked in). Power users can override with `--client-id` / `--client-secret`.

**B. Manual token paste** — for quick setup or custom apps:
```
holla slack auth login --token xoxp-1234-...
```
Auto-detects token type from prefix (`xoxp-` = user, `xoxb-` = bot).

**C. Environment variable** — for CI/scripting:
```
SLACK_TOKEN=xoxp-... holla slack chat send --channel #general --message "Deploy done"
```

#### 5. Credential storage

File-based storage at `~/.config/holla/credentials/<workspace>.json`.

**Workspace selection:**
- 1 workspace → auto-selected, no `--workspace` needed
- Multiple workspaces → must pass `--workspace <name>`

```bash
# One workspace — just works
holla slack channels list

# Multiple — must specify
holla slack channels list --workspace circles
```

#### 6. Output modes

Every ergonomic command supports three output modes:
- **table** (default) — human-friendly, colored
- **json** (`--json`) — machine-readable, to stdout
- **plain** (`--plain`) — stable tab-separated, no color

The `api` passthrough command always outputs raw JSON.

Global flags: `--json`, `--plain`, `--workspace`

#### 7. Markdown support in messages

`holla slack chat send` converts Markdown to Slack Block Kit via `@circlesac/mack`'s `markdownToBlocks`. This keeps authoring simple while preserving rich formatting (headers, bold, italic, lists, code blocks, tables, links, images).

Use `--plain` to skip conversion and send raw text.

```bash
# Markdown (default) — converted to Block Kit
holla slack chat send --channel #general --message "# Deploy Complete\n\n- **API**: v2.1.0\n- **Status**: all green"

# Plain text — no conversion
holla slack chat send --channel #general --message "simple text" --plain

# Pipe markdown from file
cat report.md | holla slack chat send --channel #general
```

#### 8. Official Slack SDK

Use `@slack/web-api` for all Slack API calls. No raw HTTP.

```typescript
import { WebClient } from "@slack/web-api";

export function createSlackClient(token: string): WebClient {
  return new WebClient(token);
}
```

The raw `api` passthrough uses `client.apiCall(method, args)` directly.

### Naming Conventions

#### Command names (Slack API namespace → ergonomic name)

| Slack API namespace | CLI command | Notes |
|---------------------|-------------|-------|
| `conversations.*` | `channels` | What people actually say |
| `chat.*` | `chat` | Already intuitive |
| `usergroups.*` | `groups` | Shorter |
| _all others_ | _same name_ | Already intuitive |

#### Action names (camelCase → kebab-case + ergonomic)

| Slack API method | CLI action | Notes |
|-----------------|------------|-------|
| `chat.postMessage` | `chat send` | "Send a message" is natural |
| `chat.postEphemeral` | `chat whisper` | Self-explanatory |
| `chat.update` | `chat edit` | "Edit a message" is what people say |
| `chat.getPermalink` | `chat permalink` | Drop verb, implied |
| `conversations.setTopic` | `channels topic` | Drop "set", implied |
| `conversations.setPurpose` | `channels purpose` | Drop "set", implied |
| `conversations.mark` | `channels mark-read` | Clearer intent |
| `users.lookupByEmail` | `users find` | Shorter, `--email` flag clarifies |
| `users.getPresence` | `users presence` | Drop verb |
| `users.profile.get` | `users profile` | Read by default |
| `users.profile.set` | `users set-profile` | Explicit write |
| `usergroups.users.list` | `groups members` | What people say |
| `usergroups.users.update` | `groups set-members` | Explicit write |
| `dnd.info` | `dnd status` | More intuitive |
| `dnd.setSnooze` | `dnd snooze` | Drop "set" |
| `dnd.endSnooze` | `dnd unsnooze` | Shorter |
| `dnd.teamInfo` | `dnd team` | Shorter |
| _all others_ | _kebab-case_ | `camelCase` → `kebab-case` |

#### Argument conventions

All arguments after `<action>` are **named flags** (no positional arguments):

| Flag | Prefix | Resolves to | Example |
|------|--------|-------------|---------|
| `--channel` | `#` | Channel ID (`C01234567`) | `--channel #general` |
| `--user` | `@` | User ID (`U01234567`) | `--user @john` |
| No prefix | — | Passed as raw ID | `--channel C01234567` |

### `#channel` and `@user` Name Resolution

The CLI resolves human-friendly names to Slack IDs transparently:

1. Strip `#` / `@` prefix
2. Look up the name via `conversations.list` / `users.list`
3. Cache results locally (`~/.config/holla/cache/`) with TTL (5 min)
4. Pass the resolved ID to the Slack API
5. If no prefix, assume raw ID and pass through

### Stdin Piping

Commands that accept `--message` also read from stdin when the flag is omitted:

```bash
echo "Deploy complete" | holla slack chat send --channel #ops
cat report.md | holla slack chat send --channel #general
git log --oneline -5 | holla slack chat send --channel #dev
```

### Pagination

Slack uses cursor-based pagination. Ergonomic commands handle it as:

- `--limit N` — total number of results to return (default: 20, max: 1000)
- `--all` — auto-paginate and return all results
- `--cursor` — manual cursor for advanced use
- JSON output includes `next_cursor` for scripting

### Rate Limiting

The `@slack/web-api` SDK handles rate limiting (HTTP 429) with automatic retries and backoff. No custom handling needed.

### OAuth Scopes

**Bot scopes** (minimal — required for app installation only):

```
channels:read
```

**User scopes** (all CLI functionality):

```
channels:history, channels:read, channels:write,
chat:write,
dnd:read, dnd:write,
files:read, files:write,
groups:history, groups:read, groups:write,
im:history, im:read, im:write,
pins:read, pins:write,
reactions:read, reactions:write,
reminders:read, reminders:write,
search:read,
stars:read, stars:write,
team:read,
users.profile:read, users.profile:write,
users:read
```

### Project Structure

```
holla-cli/
├── src/
│   ├── index.ts                  # Entry point — citty runMain
│   ├── platforms/
│   │   └── slack/
│   │       ├── index.ts          # Slack platform command (subCommands)
│   │       ├── client.ts         # Slack WebClient factory
│   │       ├── resolve.ts        # #channel / @user name resolution + cache
│   │       ├── api.ts            # Raw API passthrough command
│   │       ├── version.ts        # Slack connection info
│   │       ├── auth/
│   │       │   ├── index.ts
│   │       │   ├── login.ts
│   │       │   ├── logout.ts
│   │       │   └── status.ts
│   │       ├── channels/         # → conversations.*
│   │       ├── chat/             # → chat.*
│   │       ├── reactions/
│   │       ├── search/
│   │       ├── users/
│   │       ├── files/
│   │       ├── pins/
│   │       ├── stars/
│   │       ├── bookmarks/
│   │       ├── reminders/
│   │       ├── dnd/
│   │       ├── groups/           # → usergroups.*
│   │       ├── emoji/
│   │       └── team/
│   ├── lib/
│   │   ├── config.ts             # Config file read/write (~/.config/holla/)
│   │   ├── credentials.ts        # Token storage (~/.config/holla/credentials/)
│   │   ├── output.ts             # Output formatting (JSON / plain / table)
│   │   └── errors.ts             # Structured error types
│   └── types/
│       └── index.ts              # Shared type definitions
├── tests/
│   ├── tsconfig.json             # Extends root, adds vitest/globals
│   ├── output.spec.ts
│   ├── errors.spec.ts
│   └── credentials.spec.ts
├── slack-app-manifest.json       # Slack app manifest (source of truth for scopes)
├── vitest.config.ts
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## Dependencies

```json
{
  "dependencies": {
    "citty": "^0.2.0",
    "@slack/web-api": "^7.0.0",
    "@circlesac/mack": "^26.0.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5",
    "vitest": "^4"
  }
}
```

## Scripts

```json
{
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build --compile --outfile=dist/holla src/index.ts",
    "test": "vitest run"
  }
}
```

## Distribution

1. `bun build --compile` for standalone binaries (linux-x64, linux-arm64, darwin-x64, darwin-arm64)
2. GitHub Actions release workflow (tag-triggered)
3. npm wrapper package
4. Homebrew formula
