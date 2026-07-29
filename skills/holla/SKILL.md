---
name: holla
description: Operate holla, the multi-provider messaging CLI. Use for Slack messages, threads, search, channels, canvases, files, reactions, bookmarks, reminders, authentication, or holla setup and commands; load the matching provider reference before acting.
---

# holla

Identify the requested messaging provider, then read its reference completely before running commands:

- Slack: [references/slack.md](references/slack.md)

Use `holla --help` and `holla <provider> --help` when the installed CLI may be newer than the reference. Prefer structured output for reads, preserve the user's requested message format, and follow the provider reference's post-action verification procedure for writes.
