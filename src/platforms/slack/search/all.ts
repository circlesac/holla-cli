import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat, printPaging } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs, pagePaginationArgs } from "../../../lib/args.ts";

export const allCommand = defineCommand({
  meta: { name: "all", description: "Search messages and files" },
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

      const result = await client.search.all({
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

      const filesResult = result.files as {
        matches?: { id: string; name: string; title: string; filetype: string }[];
        paging?: { page?: number; pages?: number; total?: number };
      };
      const files = filesResult?.matches ?? [];

      printPaging("Messages: ", messagesResult?.paging);
      printPaging("Files: ", filesResult?.paging);

      if (messages.length > 0) {
        console.log("\x1b[1mMessages:\x1b[0m");
        const messageRows = messages.map((m) => ({
          channel: m.channel?.name ?? "",
          user: m.username ?? "",
          ts: m.ts,
          text: (m.text ?? "").slice(0, 80),
        }));
        printOutput(messageRows, getOutputFormat(args), [
          { key: "channel", label: "Channel" },
          { key: "user", label: "User" },
          { key: "ts", label: "Timestamp" },
          { key: "text", label: "Text" },
        ]);
      }

      if (files.length > 0) {
        if (messages.length > 0) console.log("");
        console.log("\x1b[1mFiles:\x1b[0m");
        const fileRows = files.map((f) => ({
          id: f.id,
          name: f.name,
          title: f.title,
          type: f.filetype,
        }));
        printOutput(fileRows, getOutputFormat(args), [
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "title", label: "Title" },
          { key: "type", label: "Type" },
        ]);
      }

      if (messages.length === 0 && files.length === 0) {
        console.log("No results found.");
      }
    } catch (error) {
      handleError(error);
    }
  },
});
