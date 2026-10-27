import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";
import { addFallbackRowId, parseFields, parseListId } from "./helpers.ts";

export const updateCommand = defineCommand({
	meta: { name: "update", description: "Update an item in a Slack List" },
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
		fields: {
			type: "string",
			description: "Cells to update as a JSON array",
			required: true,
		},
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace);
			const client = createSlackClient(token);
			const result = await client.apiCall("slackLists.items.update", {
				list_id: parseListId(args.list),
				cells: addFallbackRowId(parseFields(args.fields), args.row),
			});
			const format = getOutputFormat(args);
			if (format === "json") printOutput(result, format);
			else console.log(`\x1b[32m✓\x1b[0m List item ${args.row} updated`);
		} catch (error) {
			handleError(error);
		}
	},
});
