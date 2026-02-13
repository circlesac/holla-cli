import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const whoamiCommand = defineCommand({
  meta: { name: "whoami", description: "Show current authenticated user" },
  args: {
    ...commonArgs,
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const result = await client.auth.test();

      const data = {
        user_id: result.user_id ?? "",
        user: result.user ?? "",
        team_id: result.team_id ?? "",
        team: result.team ?? "",
        url: result.url ?? "",
      };

      printOutput([data], getOutputFormat(args), [
        { key: "user_id", label: "User ID" },
        { key: "user", label: "Username" },
        { key: "team_id", label: "Team ID" },
        { key: "team", label: "Team" },
        { key: "url", label: "URL" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
