---
name: slack
description: Use holla CLI to interact with Slack — send messages, read threads, search, manage canvases, and more
---

holla is a CLI tool that lets you interact with Slack as yourself (using your user token). All commands require `--workspace <name>` (or `-w`).

## Prerequisites

Authenticate first: `holla slack auth login --workspace <name>`

Check status: `holla slack auth whoami --workspace <name>`

## Sending messages

```bash
# Send to a channel
holla slack chat send --channel "#general" --text "Hello" -w <ws>

# Reply to a thread
holla slack chat reply --channel "#general" --ts 1234567890.123456 --text "Reply" -w <ws>

# Multiline via stdin
cat <<'EOF' | holla slack chat send --channel "#general" -w <ws>
Line one
Line two
EOF

# Edit a message
holla slack chat edit --channel "#general" --ts 1234567890.123456 --text "Updated" -w <ws>

# Delete a message
holla slack chat delete --channel "#general" --ts 1234567890.123456 -w <ws>
```

`--text` accepts standard markdown (converted to Slack blocks automatically). Use `--json` to get `{ ts, channel, text }` back after sending.

## Reading messages

```bash
# Channel history
holla slack channels history --channel "#general" -w <ws> --json

# Thread replies
holla slack channels history --channel "#general" --thread 1234567890.123456 -w <ws> --json

# Single message
holla slack chat get --channel "#general" --ts 1234567890.123456 -w <ws> --json
```

Use `--all` to auto-paginate. Use `--limit <n>` to control count.

## Searching

```bash
holla slack search messages --query "keyword" -w <ws> --json
```

Options: `--sort timestamp|score`, `--sort-dir asc|desc`, `--limit <n>`, `--page <n>`

## Canvases

```bash
# Create (with optional auto-share)
holla slack canvases create --title "Title" --markdown "content" --channel "#general" -w <ws>

# Edit
holla slack canvases edit --canvas <id> --operation insert_at_end --markdown "more" -w <ws>

# Share
holla slack canvases access-set --canvas <id> --level read --channels "#general" -w <ws>
```

Operations: `insert_at_start`, `insert_at_end`, `insert_before`, `insert_after`, `replace`, `delete`

## Channels

```bash
holla slack channels list -w <ws> --json          # List channels
holla slack channels info --channel "#general" -w <ws>  # Channel info
holla slack channels members --channel "#general" -w <ws> --json  # Members
holla slack channels topic --channel "#general" --topic "New topic" -w <ws>
```

## Other commands

```bash
holla slack reactions add --channel <ch> --ts <ts> --name thumbsup -w <ws>
holla slack pins add --channel <ch> --ts <ts> -w <ws>
holla slack stars add --channel <ch> --ts <ts> -w <ws>
holla slack bookmarks add --channel <ch> --title "Link" --link "https://..." -w <ws>
holla slack reminders add --text "Do thing" --time "in 1 hour" -w <ws>
holla slack files upload --channels "#general" --file ./doc.pdf -w <ws>
holla slack users info --user @username -w <ws> --json
holla slack api <method> --body '{"key":"value"}' -w <ws>  # Raw API passthrough
```

## Output formats

All read commands support: `--json` (structured), `--plain` (tab-separated), or table (default).

## Name resolution

Channels accept `#name` or ID. Users accept `@name` or ID. Fuzzy matching suggests corrections on typos.
