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
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.search.messages({
        query: args.query,
        count: args.limit ? parseInt(args.limit, 10) : 20,
        page: args.page ? parseInt(args.page, 10) : 1,
        sort: (args.sort as "score" | "timestamp") ?? "score",
        sort_dir: (args["sort-dir"] as "asc" | "desc") ?? "desc",
      });

      const messagesResult = result.messages as {
        matches?: { channel?: { name: string }; username?: string; ts: string; text: string }[];
        paging?: { page?: number; pages?: number; total?: number };
      };
      const messages = messagesResult?.matches ?? [];

      printPaging("", messagesResult?.paging);

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
      handleError(error);
    }
  },
});
