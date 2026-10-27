import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs, cursorPaginationArgs } from "../../../lib/args.ts";
import { normalizeListItem, parseListId } from "./helpers.ts";

export const readCommand = defineCommand({
	meta: { name: "read", description: "Read items in a Slack List" },
	args: {
		...commonArgs,
		...cursorPaginationArgs,
		list: {
			type: "string",
			description: "List ID or Slack List URL",
			required: true,
		},
		archived: {
			type: "boolean",
			description: "Include archived items",
			default: false,
		},
		"include-list": {
			type: "boolean",
			description: "Include List metadata and column schema",
			default: false,
		},
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace);
			const client = createSlackClient(token);
			const listId = parseListId(args.list);
			const limit = args.limit ? parseInt(args.limit, 10) : undefined;
			if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
				throw new Error("--limit must be an integer between 1 and 100");
			}

			const items: Record<string, unknown>[] = [];
			let cursor: string | undefined = args.cursor;
			let list: unknown;

			do {
				const result = (await client.apiCall("slackLists.items.list", {
					list_id: listId,
					...(limit !== undefined ? { limit } : {}),
					...(cursor ? { cursor } : {}),
					...(args.archived ? { archived: true } : {}),
					...(args["include-list"] ? { include_list: true } : {}),
				})) as unknown as Record<string, unknown>;

				if (result.list !== undefined) list = result.list;
				for (const item of (result.items as unknown[] | undefined) ?? []) {
					items.push(normalizeListItem(item));
				}
				const responseMetadata = result.response_metadata as Record<string, unknown> | undefined;
				cursor = typeof responseMetadata?.next_cursor === "string" ? responseMetadata.next_cursor : undefined;
			} while (args.all && cursor);

			const format = getOutputFormat(args);
			if (format === "json") {
				printOutput(
					{
						...(list !== undefined ? { list } : {}),
						items,
						...(cursor ? { next_cursor: cursor } : {}),
					},
					format,
				);
			} else {
				printOutput(items, format, [
					{ key: "id", label: "ID" },
					{ key: "text", label: "Text" },
					{ key: "updated_timestamp", label: "Updated" },
					{ key: "archived", label: "Archived" },
				]);
				if (cursor) console.error(`Next cursor: ${cursor}`);
			}
		} catch (error) {
			handleError(error);
		}
	},
});
