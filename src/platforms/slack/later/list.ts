import { defineCommand } from "citty";
import { getBrowserCredentials } from "../../../lib/credentials.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs, cursorPaginationArgs } from "../../../lib/args.ts";

async function callSavedApi(
  workspace: string,
  endpoint: string,
  browserToken: string,
  browserCookie: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({ token: browserToken, ...params });
  const response = await fetch(`https://${workspace}.slack.com/api/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `d=${browserCookie}`,
    },
    body: body.toString(),
  });
  const data = await response.json() as Record<string, unknown>;
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
  }
  return data;
}

export { callSavedApi };

export const listCommand = defineCommand({
  meta: { name: "list", description: "List saved (Later) items" },
  args: {
    ...commonArgs,
    ...cursorPaginationArgs,
    filter: {
      type: "string",
      description: "Filter: saved, completed, all (default: saved)",
    },
  },
  async run({ args }) {
    try {
      const { browserToken, browserCookie, workspace } = await getBrowserCredentials(args.workspace);

      type SavedItem = {
        item_id: string;
        item_type: string;
        ts: string;
        state: string;
        date_created: number;
        date_due?: number;
        date_snoozed_until?: number;
      };

      const limitNum = args.limit ? parseInt(args.limit, 10) : 50;
      if (limitNum > 50) {
        console.error("\x1b[31m✗\x1b[0m --limit cannot exceed 50 for Later API");
        process.exit(1);
      }

      const allItems: SavedItem[] = [];
      let cursor: string | undefined = args.cursor;

      do {
        const params: Record<string, string> = {
          filter: (args.filter as string) ?? "saved",
          limit: String(limitNum),
        };
        if (cursor) params.cursor = cursor;

        const result = await callSavedApi(workspace, "saved.list", browserToken, browserCookie, params);

        const items = (result.saved_items as SavedItem[]) ?? [];
        allItems.push(...items);

        const meta = result.response_metadata as { next_cursor?: string } | undefined;
        cursor = meta?.next_cursor || undefined;
      } while (args.all && cursor);

      const rows = allItems.map((item) => ({
        item_id: item.item_id,
        type: item.item_type,
        ts: item.ts,
        state: item.state,
        date_created: new Date(item.date_created * 1000).toISOString(),
        date_due: item.date_due ? new Date(item.date_due * 1000).toISOString() : "",
        date_snoozed_until: item.date_snoozed_until ? new Date(item.date_snoozed_until * 1000).toISOString() : "",
      }));

      printOutput(rows, getOutputFormat(args), [
        { key: "item_id", label: "Channel/Item ID" },
        { key: "type", label: "Type" },
        { key: "ts", label: "Timestamp" },
        { key: "state", label: "State" },
        { key: "date_created", label: "Saved At" },
        { key: "date_due", label: "Due" },
        { key: "date_snoozed_until", label: "Snoozed Until" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
