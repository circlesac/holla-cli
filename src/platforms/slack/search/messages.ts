import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat, printPaging } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs, pagePaginationArgs } from "../../../lib/args.ts";

export const messagesCommand = defineCommand({
  meta: { name: "messages", description: "Search messages" },
  args: {
    ...commonArgs,
    ...pagePaginationArgs,
    query: {
      type: "string",
      description: "Search query",
      required: true,
    },
  },
  async run({ args }) {
    try {
      if (args.limit && parseInt(args.limit, 10) > 100) {
        console.error("\x1b[31m✗\x1b[0m --limit cannot exceed 100 for search API");
        process.exit(1);
      }

      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.search.messages({
        query: args.query,
        ...(args.limit ? { count: parseInt(args.limit, 10) } : {}),
        page: args.page ? parseInt(args.page, 10) : 1,
        sort: (args.sort as "score" | "timestamp") ?? "score",
        sort_dir: (args["sort-dir"] as "asc" | "desc") ?? "desc",
      });

      const messagesResult = result.messages as {
        matches?: { channel?: { id?: string; name: string }; username?: string; ts: string; text: string; thread_ts?: string; permalink?: string }[];
        paging?: { page?: number; pages?: number; total?: number };
      };
      const messages = messagesResult?.matches ?? [];

      printPaging("", messagesResult?.paging);

      const format = getOutputFormat(args);
      const rows = messages.map((m) => {
        const row: Record<string, string> = {
          channelId: m.channel?.id ?? "",
          channel: m.channel?.name ?? "",
          user: m.username ?? "",
          ts: m.ts,
          text: format === "json" ? (m.text ?? "") : (m.text ?? "").slice(0, 80),
        };
        if (m.thread_ts) row.thread_ts = m.thread_ts;
        if (m.permalink) row.permalink = m.permalink;
        return row;
      });

      printOutput(rows, format, [
        { key: "channelId", label: "Channel ID" },
        { key: "channel", label: "Channel" },
        { key: "user", label: "User" },
        { key: "ts", label: "Timestamp" },
        { key: "text", label: "Text" },
        { key: "permalink", label: "Permalink" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
