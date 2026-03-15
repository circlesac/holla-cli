import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs, cursorPaginationArgs } from "../../../lib/args.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List starred items" },
  args: {
    ...commonArgs,
    ...cursorPaginationArgs,
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const items: Record<string, unknown>[] = [];
      let cursor: string | undefined = args.cursor;

      do {
        const params: Record<string, unknown> = {};
        if (args.limit) params.count = parseInt(args.limit, 10);
        if (cursor) params.cursor = cursor;

        const result = await client.stars.list(params);

        for (const item of (result.items as Record<string, unknown>[] | undefined) ?? []) {
          const message = item.message as Record<string, unknown> | undefined;
          const file = item.file as Record<string, unknown> | undefined;
          const entry: Record<string, unknown> = {
            type: item.type ?? "",
            channel: message?.channel ?? item.channel ?? "",
            ts: message?.ts ?? "",
            text: message?.text ?? file?.name ?? "",
            date_create: item.date_create ?? "",
          };
          if (message?.thread_ts) entry.thread_ts = message.thread_ts;
          if (message?.edited) entry.edited = message.edited;
          const permalink = (message?.permalink ?? file?.permalink ?? "") as string;
          if (permalink) entry.permalink = permalink;
          items.push(entry);
        }

        cursor = result.response_metadata?.next_cursor || undefined;
      } while (args.all && cursor);

      printOutput(items, getOutputFormat(args), [
        { key: "type", label: "Type" },
        { key: "channel", label: "Channel" },
        { key: "ts", label: "Timestamp" },
        { key: "text", label: "Text" },
        { key: "date_create", label: "Starred At" },
        { key: "permalink", label: "Permalink" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
