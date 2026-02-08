import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const messagesCommand = defineCommand({
  meta: { name: "messages", description: "Search messages" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
    query: {
      type: "string",
      description: "Search query",
      required: true,
    },
    limit: {
      type: "string",
      description: "Number of results to return (default 20)",
    },
    sort: {
      type: "string",
      description: "Sort by: score or timestamp (default score)",
    },
    "sort-dir": {
      type: "string",
      description: "Sort direction: asc or desc (default desc)",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.search.messages({
        query: args.query,
        count: args.limit ? parseInt(args.limit, 10) : 20,
        sort: (args.sort as "score" | "timestamp") ?? "score",
        sort_dir: (args["sort-dir"] as "asc" | "desc") ?? "desc",
      });

      const messages = (
        result.messages as {
          matches?: { channel?: { name: string }; username?: string; ts: string; text: string }[];
        }
      )?.matches ?? [];

      const rows = messages.map((m) => ({
        channel: m.channel?.name ?? "",
        user: m.username ?? "",
        ts: m.ts,
        text: (m.text ?? "").slice(0, 80),
      }));

      printOutput(rows, getOutputFormat(args), [
        { key: "channel", label: "Channel" },
        { key: "user", label: "User" },
        { key: "ts", label: "Timestamp" },
        { key: "text", label: "Text" },
      ]);
    } catch (error) {
      console.error(
        `\x1b[31m\u2717\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
