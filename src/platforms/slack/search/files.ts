import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const filesCommand = defineCommand({
  meta: { name: "files", description: "Search files" },
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
    page: {
      type: "string",
      description: "Page number (default 1)",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.search.files({
        query: args.query,
        count: args.limit ? parseInt(args.limit, 10) : 20,
        page: args.page ? parseInt(args.page, 10) : 1,
        sort: (args.sort as "score" | "timestamp") ?? "score",
        sort_dir: (args["sort-dir"] as "asc" | "desc") ?? "desc",
      });

      const files = (
        result.files as {
          matches?: { id: string; name: string; title: string; filetype: string; user: string }[];
        }
      )?.matches ?? [];

      const rows = files.map((f) => ({
        id: f.id,
        name: f.name,
        title: f.title,
        type: f.filetype,
        user: f.user,
      }));

      printOutput(rows, getOutputFormat(args), [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "title", label: "Title" },
        { key: "type", label: "Type" },
        { key: "user", label: "User" },
      ]);
    } catch (error) {
      console.error(
        `\x1b[31m\u2717\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
