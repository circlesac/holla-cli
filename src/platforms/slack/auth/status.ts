import { defineCommand } from "citty";
import { listWorkspaces } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const statusCommand = defineCommand({
  meta: { name: "status", description: "Show authentication status" },
  args: {
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
  },
  async run({ args }) {
    const workspaces = await listWorkspaces();

    if (workspaces.length === 0) {
      console.log(
        'No workspaces configured. Run "holla slack auth login" to authenticate.',
      );
      return;
    }

    const results = [];

    for (const ws of workspaces) {
      const entry: Record<string, string> = { workspace: ws.name };

      if (ws.botToken) {
        try {
          const client = createSlackClient(ws.botToken);
          await client.auth.test();
          entry["bot"] = "✓";
        } catch {
          entry["bot"] = "✗ (invalid)";
        }
      } else {
        entry["bot"] = "—";
      }

      if (ws.userToken) {
        try {
          const client = createSlackClient(ws.userToken);
          await client.auth.test();
          entry["user"] = "✓";
        } catch {
          entry["user"] = "✗ (invalid)";
        }
      } else {
        entry["user"] = "—";
      }

      results.push(entry);
    }

    printOutput(results, getOutputFormat(args), [
      { key: "workspace", label: "Workspace" },
      { key: "bot", label: "Bot" },
      { key: "user", label: "User" },
    ]);
  },
});
