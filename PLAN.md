# holla-cli — Implementation Plan

> Feature-complete Slack CLI (with future multi-platform support)

## Overview

`holla` is a CLI tool for interacting with messaging platforms. The first platform is **Slack**. The architecture supports adding more platforms (e.g., Discord, Teams) later via `holla <platform> <command>` pattern.

```
holla slack channels list
holla slack messages send --channel general "Hello!"
holla slack messages history --channel general
holla slack users list
holla slack files upload --channel general ./report.pdf
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
├── slack                         # Slack platform
│   ├── auth
│   │   ├── login                 # Authenticate with Slack (OAuth or token)
│   │   ├── logout                # Remove stored credentials
│   │   ├── status                # Show current auth status
│   │   └── switch                # Switch between workspaces
│   ├── channels
│   │   ├── list                  # List channels
│   │   ├── info <channel>        # Channel details
│   │   ├── create <name>         # Create a channel
│   │   ├── join <channel>        # Join a channel
│   │   ├── leave <channel>       # Leave a channel
│   │   └── archive <channel>     # Archive a channel
│   ├── messages
│   │   ├── send <channel> <text> # Send a message
│   │   ├── history <channel>     # View channel message history
│   │   ├── thread <channel> <ts> # View/reply to a thread
│   │   └── search <query>        # Search messages
│   ├── reactions
│   │   ├── add <channel> <ts> <emoji>    # Add reaction
│   │   └── remove <channel> <ts> <emoji> # Remove reaction
│   ├── users
│   │   ├── list                  # List workspace users
│   │   ├── info <user>           # User profile info
│   │   └── status [text] [emoji] # Get/set your status
│   ├── files
│   │   ├── upload <file>         # Upload a file
│   │   ├── list                  # List files
│   │   └── download <file-id>    # Download a file
│   └── version                   # Show Slack connection info
└── version                       # Show holla-cli version
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
│   │       ├── auth/
│   │       │   ├── index.ts      # Auth subcommand group
│   │       │   ├── login.ts      # OAuth flow / token input
│   │       │   ├── logout.ts
│   │       │   ├── status.ts
│   │       │   └── switch.ts
│   │       ├── channels/
│   │       │   ├── index.ts
│   │       │   ├── list.ts
│   │       │   ├── info.ts
│   │       │   ├── create.ts
│   │       │   ├── join.ts
│   │       │   ├── leave.ts
│   │       │   └── archive.ts
│   │       ├── messages/
│   │       │   ├── index.ts
│   │       │   ├── send.ts
│   │       │   ├── history.ts
│   │       │   ├── thread.ts
│   │       │   └── search.ts
│   │       ├── reactions/
│   │       │   ├── index.ts
│   │       │   ├── add.ts
│   │       │   └── remove.ts
│   │       ├── users/
│   │       │   ├── index.ts
│   │       │   ├── list.ts
│   │       │   ├── info.ts
│   │       │   └── status.ts
│   │       └── files/
│   │           ├── index.ts
│   │           ├── upload.ts
│   │           ├── list.ts
│   │           └── download.ts
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

#### 1. Platform-first routing

The top-level subcommand is the platform. This makes it trivial to add new platforms later:

```typescript
// src/index.ts
const main = defineCommand({
  meta: { name: "holla", version, description: "CLI for messaging platforms" },
  subCommands: {
    slack: () => import("./platforms/slack/index.ts").then(m => m.default),
    // discord: () => import("./platforms/discord/index.ts").then(m => m.default),
    // teams: () => import("./platforms/teams/index.ts").then(m => m.default),
  },
});
```

#### 2. Credential storage via OS keychain

Follow shh-env pattern — use OS keychain (macOS Keychain, Linux SecretService) for token storage. Service name: `holla-slack` (or `holla-<platform>`).

```
Keychain entry:
  service: holla
  account: slack:<workspace-id>
  value:   xoxb-... or xoxp-...
```

#### 3. Config file

`~/.config/holla/config.json` stores non-secret preferences:

```json
{
  "slack": {
    "defaultWorkspace": "T01234567",
    "outputFormat": "table"
  }
}
```

#### 4. Output modes (inspired by gogcli)

Every command supports three output modes:
- **table** (default) — human-friendly, colored
- **json** (`--json`) — machine-readable, to stdout
- **plain** (`--plain`) — stable tab-separated, no color

Global flags: `--json`, `--plain`, `--verbose`, `--workspace`

#### 5. Markdown support in messages

Slack messages accept Block Kit. We will support Markdown in `holla slack messages send` by converting Markdown to blocks using `@circlesac/mock`’s `markdownToBlocks` function (repo: `circlesac/mack`, module not published yet). This keeps authoring simple while preserving rich formatting.

#### 6. Official Slack SDK

Use `@slack/web-api` for all Slack API calls. No raw HTTP.

```typescript
import { WebClient } from "@slack/web-api";

export function createSlackClient(token: string): WebClient {
  return new WebClient(token);
}
```

## Implementation Phases

### Phase 1 — Project scaffold + Auth

1. Initialize Bun project (`bun init`, `package.json`, `tsconfig.json`)
2. Install dependencies: `citty`, `@slack/web-api`
3. Set up entry point with citty command tree
4. Implement `holla slack auth login` (token-based, paste xoxb/xoxp token)
5. Implement `holla slack auth status` (verify token, show workspace info)
6. Implement `holla slack auth logout`
7. Config file read/write (`~/.config/holla/`)
8. Credential storage via OS keychain

### Phase 2 — Channels + Messages

1. `holla slack channels list` (with pagination)
2. `holla slack channels info <channel>`
3. `holla slack messages send <channel> <text>`
4. `holla slack messages history <channel>` (with `--limit`, `--before`)
5. `holla slack messages search <query>`
6. Output formatting (table/json/plain)

### Phase 3 — Threads, Reactions, Users

1. `holla slack messages thread <channel> <ts>`
2. `holla slack reactions add/remove`
3. `holla slack users list`
4. `holla slack users info <user>`
5. `holla slack users status`

### Phase 4 — Files + Polish

1. `holla slack files upload <file> --channel <channel>`
2. `holla slack files list`
3. `holla slack files download <file-id>`
4. `holla slack channels create/join/leave/archive`
5. `holla slack auth switch` (multi-workspace)
6. `holla version`
7. Shell completions
8. Error handling polish

### Phase 5 — Distribution

1. `bun build --compile` for standalone binaries
2. npm wrapper package (follow shh-env pattern)
3. Homebrew formula
4. GitHub Actions release workflow
5. README documentation

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
