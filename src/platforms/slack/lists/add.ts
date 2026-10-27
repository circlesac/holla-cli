import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";
import { parseFields, parseListId } from "./helpers.ts";

export const addCommand = defineCommand({
	meta: { name: "add", description: "Add an item to a Slack List" },
	args: {
		...commonArgs,
		list: {
			type: "string",
			description: "List ID or Slack List URL",
			required: true,
		},
		fields: {
			type: "string",
			description: "Initial fields as a JSON array",
			required: true,
		},
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace);
			const client = createSlackClient(token);
			const result = await client.apiCall("slackLists.items.create", {
				list_id: parseListId(args.list),
				initial_fields: parseFields(args.fields),
			});
			const format = getOutputFormat(args);
			if (format === "json") printOutput(result, format);
			else console.log("\x1b[32m✓\x1b[0m List item added");
		} catch (error) {
			handleError(error);
		}
	},
});
