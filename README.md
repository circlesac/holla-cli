# holla-cli

CLI for interacting with Slack from the terminal.

```
holla slack <command> <action> [--flags]
```

## Install

```bash
# From source
bun install
bun run build  # outputs dist/holla

# Or run directly
bun run src/index.ts
```

## Quick Start

```bash
# Authenticate via OAuth (opens browser)
holla slack auth login

# Or paste a token directly
holla slack auth login --token xoxb-...
```

## Commands

### Auth

```bash
holla slack auth login        # OAuth login (default) or --token
holla slack auth logout       # Remove stored credentials
holla slack auth status       # Show auth status for all workspaces
```

### Channels

```bash
holla slack channels list                          # List channels
holla slack channels info --channel #general       # Channel details
holla slack channels history --channel #general    # Message history
holla slack channels create --name new-channel     # Create channel
holla slack channels join --channel #general       # Join channel
holla slack channels leave --channel #general      # Leave channel
holla slack channels topic --channel #general --topic "New topic"
```

### Chat

```bash
holla slack chat send --channel #general --message "Hello!"
echo "piped message" | holla slack chat send --channel #general
holla slack chat edit --channel #general --ts 1234 --message "Updated"
holla slack chat delete --channel #general --ts 1234
holla slack chat schedule --channel #general --message "Later" --post-at 1735689600
```

### Search

```bash
holla slack search messages --query "deploy"
holla slack search files --query "report"
```

### Users

```bash
holla slack users list
holla slack users info --user @john
holla slack users find --email john@example.com
holla slack users profile --user @john
```

### Reactions

```bash
holla slack reactions add --channel #general --ts 1234 --name thumbsup
holla slack reactions remove --channel #general --ts 1234 --name thumbsup
```

### Files

```bash
holla slack files upload --channel #general --file ./report.pdf
holla slack files list
holla slack files delete --file F1234
```

### Other Commands

```bash
holla slack pins add/list/remove
holla slack stars add/list/remove
holla slack bookmarks add/edit/list/remove
holla slack reminders add/list/info/complete/delete
holla slack dnd status/snooze/unsnooze/end
holla slack groups create/list/update/enable/disable/members/set-members
holla slack emoji list
holla slack team info/profile
```

### Raw API Passthrough

For any Slack API method not covered by the commands above:

```bash
holla slack api conversations.requestSharedInvite.approve --invite-id I123
holla slack api chat.scheduledMessages.list
holla slack api admin.conversations.restrictAccess.addGroup --channel-id C123
```

## Name Resolution

Use `#channel` and `@user` syntax — they resolve to IDs automatically:

```bash
holla slack chat send --channel #general --message "Hello!"
holla slack users info --user @john
```

Raw IDs work too: `--channel C01234567`

## Output Formats

```bash
holla slack channels list              # table (default)
holla slack channels list --json       # JSON output
holla slack channels list --plain      # tab-separated, no color
```

## Multi-Workspace

```bash
# With one workspace, --workspace can be omitted
holla slack channels list

# With multiple workspaces, specify which one
holla slack channels list --workspace circles
```

## Skills

| Skill | Description |
|-------|-------------|
| **slack** | Interact with Slack — send messages, read threads, search, manage canvases, and more |

### Claude Code

```bash
# Add marketplace
/plugin marketplace add circlesac/holla-cli

# Install plugin
/plugin install holla
```

### Pi

```bash
pi install git:circlesac/holla-cli
# or: npx @mariozechner/pi-coding-agent install git:circlesac/holla-cli
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SLACK_TOKEN` | Override token for all commands |
| `SLACK_CLIENT_ID` | Custom OAuth client ID |
| `SLACK_CLIENT_SECRET` | Custom OAuth client secret |
