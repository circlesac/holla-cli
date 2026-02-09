import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveUser } from "../resolve.ts";

export const profileCommand = defineCommand({
  meta: { name: "profile", description: "Get user profile" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    user: {
      type: "string",
      description: "User ID or @name (defaults to current user)",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const params: Record<string, unknown> = {};
      if (args.user) {
        params.user = await resolveUser(client, args.user, workspace);
      }

      const result = await client.users.profile.get(params);

      if (args.json) {
        console.log(JSON.stringify(result.profile, null, 2));
      } else {
        const profile = result.profile as {
          real_name?: string;
          display_name?: string;
          email?: string;
          phone?: string;
          title?: string;
          status_text?: string;
          status_emoji?: string;
          image_72?: string;
        };
        console.log(`Real Name:     ${profile.real_name ?? ""}`);
        console.log(`Display Name:  ${profile.display_name ?? ""}`);
        console.log(`Email:         ${profile.email ?? ""}`);
        console.log(`Phone:         ${profile.phone ?? ""}`);
        console.log(`Title:         ${profile.title ?? ""}`);
        if (profile.status_text) {
          console.log(`Status:        ${profile.status_emoji ?? ""} ${profile.status_text}`);
        }
        if (profile.image_72) {
          console.log(`Avatar:        ${profile.image_72}`);
        }
      }
    } catch (error) {
      console.error(
        `\x1b[31m\u2717\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
