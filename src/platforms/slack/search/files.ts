import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat, printPaging } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs, pagePaginationArgs } from "../../../lib/args.ts";

export const filesCommand = defineCommand({
  meta: { name: "files", description: "Search files" },
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

      const result = await client.search.files({
        query: args.query,
        ...(args.limit ? { count: parseInt(args.limit, 10) } : {}),
        page: args.page ? parseInt(args.page, 10) : 1,
        sort: (args.sort as "score" | "timestamp") ?? "score",
        sort_dir: (args["sort-dir"] as "asc" | "desc") ?? "desc",
      });

      const filesResult = result.files as {
        matches?: { id: string; name: string; title: string; filetype: string; user: string; permalink?: string }[];
        paging?: { page?: number; pages?: number; total?: number };
      };
      const files = filesResult?.matches ?? [];

      printPaging("", filesResult?.paging);

      const rows = files.map((f) => {
        const row: Record<string, string> = {
          id: f.id,
          name: f.name,
          title: f.title,
          type: f.filetype,
          user: f.user,
        };
        if (f.permalink) row.permalink = f.permalink;
        return row;
      });

      printOutput(rows, getOutputFormat(args), [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "title", label: "Title" },
        { key: "type", label: "Type" },
        { key: "user", label: "User" },
        { key: "permalink", label: "Permalink" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
