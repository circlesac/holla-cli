import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";
import { parseListId } from "./helpers.ts";

export const deleteCommand = defineCommand({
	meta: { name: "delete", description: "Delete an item from a Slack List" },
	args: {
		...commonArgs,
		list: {
			type: "string",
			description: "List ID or Slack List URL",
			required: true,
		},
		row: {
			type: "string",
			description: "List item/row ID",
			required: true,
		},
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace);
			const client = createSlackClient(token);
			const result = await client.apiCall("slackLists.items.delete", {
				list_id: parseListId(args.list),
				id: args.row,
			});
			const format = getOutputFormat(args);
			if (format === "json") printOutput(result, format);
			else console.log(`\x1b[32m✓\x1b[0m List item ${args.row} deleted`);
		} catch (error) {
			handleError(error);
		}
	},
});
