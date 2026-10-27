import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";
import { parseListId } from "./helpers.ts";

export const infoCommand = defineCommand({
	meta: { name: "info", description: "Show Slack List metadata and columns" },
	args: {
		...commonArgs,
		list: {
			type: "string",
			description: "List ID or Slack List URL",
			required: true,
		},
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace);
			const client = createSlackClient(token);
			const result = (await client.apiCall("slackLists.items.list", {
				list_id: parseListId(args.list),
				limit: 1,
				include_list: true,
			})) as unknown as Record<string, unknown>;
			const format = getOutputFormat(args);
			if (format === "json") printOutput(result.list ?? result, format);
			else printOutput(result.list ?? result, format);
		} catch (error) {
			handleError(error);
		}
	},
});
