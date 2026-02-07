# holla-cli — Implementation Plan

> Feature-complete Slack CLI (with future multi-platform support)

## Overview

`holla` is a CLI tool for interacting with messaging platforms. The first platform is **Slack**. The architecture supports adding more platforms (e.g., Discord, Teams) later via `holla <provider> <command> <action>` pattern.

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
| Markdown to Blocks | **@circlesac/mock** | Convert Markdown to Slack Block Kit via `markdownToBlocks` (module not published yet; from circlesac/mack repo) |
| Testing | **bun:test** | Built-in, no extra deps |
| Linting | **@circlesac/lint** | Company standard |
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
│   │   ├── send                       # → chat.postMessage
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

### Raw API Passthrough (`holla slack api`)

For any Slack Web API method not covered by ergonomic commands:

```bash
# Pass the exact Slack API method name + flags as key-value pairs
holla slack api conversations.requestSharedInvite.approve --invite-id I123
holla slack api admin.conversations.restrictAccess.addGroup --channel-id C123 --group-id S123
holla slack api chat.scheduledMessages.list

# Supports --body for raw JSON body
holla slack api chat.postMessage --body '{"channel":"C123","text":"hello"}'

# Output is always the raw JSON response from Slack
```

This ensures 100% Slack API coverage without implementing 150+ leaf commands.

### `#channel` and `@user` Name Resolution

The CLI resolves human-friendly names to Slack IDs transparently:

1. Strip `#` / `@` prefix
2. Look up the name via `conversations.list` / `users.list`
3. Cache results locally (`~/.config/holla/cache/`) with TTL (e.g., 5 min)
4. Pass the resolved ID to the Slack API
5. If no prefix, assume raw ID and pass through

```bash
holla slack chat send --channel #general --message "Hello!"
# Resolves #general → C01234567, then calls chat.postMessage

holla slack chat send --channel C01234567 --message "Hello!"
# Passes C01234567 directly
```

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

```bash
holla slack channels list --limit 50
holla slack channels list --all
holla slack channels list --all --json | jq '.[].name'
```

### Rate Limiting

The `@slack/web-api` SDK handles rate limiting (HTTP 429) with automatic retries and backoff. No custom handling needed. The `--verbose` flag will log retry attempts.

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
│   │       ├── auth/
│   │       │   ├── index.ts
│   │       │   ├── login.ts
│   │       │   ├── logout.ts
│   │       │   ├── status.ts
│   │       │   └── switch.ts
│   │       ├── channels/         # → conversations.*
│   │       │   ├── index.ts
│   │       │   ├── list.ts
│   │       │   ├── info.ts
│   │       │   ├── create.ts
│   │       │   ├── history.ts
│   │       │   ├── replies.ts
│   │       │   └── ...
│   │       ├── chat/             # → chat.*
│   │       │   ├── index.ts
│   │       │   ├── send.ts
│   │       │   ├── whisper.ts
│   │       │   ├── edit.ts
│   │       │   ├── delete.ts
│   │       │   └── ...
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
│   │   ├── credentials.ts        # Token storage (OS keychain via Bun.secrets)
│   │   ├── output.ts             # Output formatting (JSON / plain / table)
│   │   └── errors.ts             # Structured error types
│   └── types/
│       └── index.ts              # Shared type definitions
├── tests/
│   ├── cli.test.ts               # Integration tests
│   ├── slack/                    # Slack command tests
│   └── lib/                      # Library unit tests
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

### Key Design Decisions

#### 1. Strict 3-level routing

citty routes exactly 3 levels: `<provider>` → `<command>` → `<action>`. Everything after `<action>` is named flags. No positional arguments, no deeper nesting.

#### 2. Hybrid command model

- **Ergonomic commands**: Human-friendly names, kebab-case, all named flags, formatted output
- **Raw API passthrough** (`holla slack api <method>`): Any Slack method with `--key value` flags, always returns raw JSON
- Ergonomic commands are added incrementally; `api` gives 100% coverage from day one

#### 3. Authentication strategy

Three ways to authenticate, in order of preference:

**A. OAuth flow (default)** — one command, gets both tokens:
```
holla slack auth login
> Opening browser for Slack authorization...
> Waiting for callback on http://localhost:9876/callback...
✓ Authorized! Tokens saved for "Circles Inc" (T01234567)
  Bot token:  ✓ xoxb-...****
  User token: ✓ xoxp-...****
```

Flow:
1. CLI starts local HTTP server on a random port
2. Opens browser to `https://slack.com/oauth/v2/authorize` with both `scope` (bot) and `user_scope` (user)
3. User clicks "Allow"
4. Slack redirects to `localhost:PORT/callback?code=XXX`
5. CLI exchanges code for tokens via `oauth.v2.access`
6. Response contains both `access_token` (xoxb) and `authed_user.access_token` (xoxp)
7. Both stored in OS keychain

Ships with a Circles-owned Slack app (client_id baked in). Power users can override with `--client-id` / `--client-secret`.

**B. Manual token paste** — for quick setup or custom apps:
```
holla slack auth login --token xoxp-1234-...
```
Auto-detects token type from prefix. Run twice for both bot + user tokens.

**C. Environment variable** — for CI/scripting:
```
SLACK_TOKEN=xoxp-... holla slack chat send --channel #general --message "Deploy done"
```

**Token selection per command:**

The CLI automatically picks the right token based on what the API requires:

| API | Token used |
|-----|-----------|
| `search.*`, `stars.*`, `dnd.setSnooze`, `users.profile.set` | User (`xoxp`) |
| `chat.postMessage`, `conversations.*`, most others | Bot (`xoxb`), falls back to user |

If only one token is available, it's used for everything.

#### 4. Credential storage via OS keychain

Follow shh-env pattern — use OS keychain (macOS Keychain, Linux SecretService) for token storage.

Workspace name is the Slack subdomain (`circles` from `circles.slack.com`).

```
Keychain entries per workspace:
  service: holla
  account: slack:circles:bot       → xoxb-...
  account: slack:circles:user      → xoxp-...
  account: slack:personal:user     → xoxp-...
```

**Workspace selection:**
- 1 workspace → auto-selected, no `--workspace` needed
- Multiple workspaces → must pass `--workspace <name>`

```bash
# One workspace — just works
holla slack channels list

# Multiple — must specify
holla slack channels list
✗ Multiple workspaces found. Use --workspace:
  - circles  (circles.slack.com)
  - personal (personal.slack.com)

holla slack channels list --workspace circles
```

`holla slack auth status` shows all workspaces:
```
circles   circles.slack.com    bot ✓  user ✓
personal  personal.slack.com   user ✓
```

#### 5. Config file

`~/.config/holla/config.json` stores non-secret preferences:

```json
{
  "slack": {
    "outputFormat": "table"
  }
}
```

#### 5. Output modes (inspired by gogcli)

Every ergonomic command supports three output modes:
- **table** (default) — human-friendly, colored
- **json** (`--json`) — machine-readable, to stdout
- **plain** (`--plain`) — stable tab-separated, no color

The `api` passthrough command always outputs raw JSON.

Global flags: `--json`, `--plain`, `--verbose`, `--workspace`

#### 6. Markdown support in messages

Slack messages accept Block Kit. We will support Markdown in `holla slack chat send` by converting Markdown to blocks using `@circlesac/mock`'s `markdownToBlocks` function (repo: `circlesac/mack`, module not published yet). This keeps authoring simple while preserving rich formatting.

#### 7. Official Slack SDK

Use `@slack/web-api` for all Slack API calls. No raw HTTP.

```typescript
import { WebClient } from "@slack/web-api";

export function createSlackClient(token: string): WebClient {
  return new WebClient(token);
}
```

The raw `api` passthrough uses `client.apiCall(method, args)` directly — the same method the SDK uses internally for all its named methods.

## Implementation Phases

### Phase 1 — Project scaffold + Auth + API passthrough

1. Initialize Bun project (`bun init`, `package.json`, `tsconfig.json`)
2. Install dependencies: `citty`, `@slack/web-api`
3. Set up entry point with citty command tree (3-level routing)
4. Implement `holla slack auth login` (token-based, paste xoxb/xoxp token)
5. Implement `holla slack auth status` (verify token via `auth.test`)
6. Implement `holla slack auth logout`
7. Config file read/write (`~/.config/holla/`)
8. Credential storage via OS keychain
9. Implement `holla slack api <method>` — raw API passthrough (gives 100% coverage immediately)

### Phase 2 — Channels + Chat + Name resolution

1. `#channel` / `@user` name resolution with local cache
2. `holla slack channels list` (with `--limit`, `--all` pagination)
3. `holla slack channels info --channel #general`
4. `holla slack channels history --channel #general` (with `--limit`, `--before`)
5. `holla slack channels replies --channel #general --ts 123`
6. `holla slack chat send --channel #general --message "Hello!"` (with Markdown → Block Kit)
7. `holla slack chat edit --channel #general --ts 123 --message "Fixed"`
8. `holla slack chat delete --channel #general --ts 123`
9. Stdin piping support for `--message`
10. Output formatting (table/json/plain)

### Phase 3 — Search, Reactions, Users

1. `holla slack search messages --query "deploy"`
2. `holla slack search files --query "report"`
3. `holla slack reactions add/remove/get/list`
4. `holla slack users list`
5. `holla slack users info --user @john`
6. `holla slack users find --email john@company.com`
7. `holla slack users profile / set-profile`

### Phase 4 — Files, Pins, Stars, Bookmarks, Reminders, DND

1. `holla slack files upload/list/info/delete`
2. `holla slack pins add/list/remove`
3. `holla slack stars add/list/remove`
4. `holla slack bookmarks add/edit/list/remove`
5. `holla slack reminders add/list/info/complete/delete`
6. `holla slack dnd status/snooze/unsnooze/end`

### Phase 5 — Remaining + Polish

1. `holla slack channels create/archive/unarchive/join/leave/invite/kick/topic/purpose/mark-read`
2. `holla slack chat whisper/permalink/schedule/unfurl`
3. `holla slack groups create/list/update/enable/disable/members/set-members`
4. `holla slack emoji list`
5. `holla slack team info/profile`
6. `holla version`
8. Shell completions
9. Error handling polish

### Phase 6 — Distribution

1. `bun build --compile` for standalone binaries
3. npm wrapper package (follow shh-env pattern)
4. Homebrew formula
5. GitHub Actions release workflow
6. README documentation

## Dependencies

```json
{
  "dependencies": {
    "citty": "^0.2.0",
    "@slack/web-api": "^7.0.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5"
  }
}
```

## Scripts

```json
{
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build --compile --outfile=dist/holla src/index.ts",
    "test": "bun test",
    "lint": "npx @circlesac/lint --all"
  }
}
```
