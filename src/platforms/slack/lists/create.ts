import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const createCommand = defineCommand({
	meta: { name: "create", description: "Create a Slack List" },
	args: {
		...commonArgs,
		name: {
			type: "string",
			description: "List name",
			required: true,
		},
	},
	async run({ args }) {
		try {
			const { token } = await getToken(args.workspace);
			const client = createSlackClient(token);
			const result = (await client.apiCall("slackLists.create", { name: args.name })) as unknown as Record<string, unknown>;
			const format = getOutputFormat(args);
			if (format === "json") {
				printOutput(result, format);
			} else {
				console.log(`\x1b[32m✓\x1b[0m List created: ${result.list_id ?? "unknown"}`);
			}
		} catch (error) {
			handleError(error);
		}
	},
});
