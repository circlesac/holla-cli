import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveUser } from "../resolve.ts";

export const infoCommand = defineCommand({
  meta: { name: "info", description: "Get user info" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    user: {
      type: "string",
      description: "User ID or @name",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const userId = await resolveUser(client, args.user, workspace);
      const result = await client.users.info({ user: userId });

      if (args.json) {
        console.log(JSON.stringify(result.user, null, 2));
      } else {
        const user = result.user as {
          id?: string;
          name?: string;
          real_name?: string;
          tz?: string;
          is_admin?: boolean;
          is_bot?: boolean;
          profile?: { display_name?: string; email?: string; status_text?: string; status_emoji?: string };
        };
        console.log(`ID:            ${user.id ?? ""}`);
        console.log(`Name:          ${user.name ?? ""}`);
        console.log(`Real Name:     ${user.real_name ?? ""}`);
        console.log(`Display Name:  ${user.profile?.display_name ?? ""}`);
        console.log(`Email:         ${user.profile?.email ?? ""}`);
        console.log(`Timezone:      ${user.tz ?? ""}`);
        console.log(`Admin:         ${user.is_admin ?? false}`);
        console.log(`Bot:           ${user.is_bot ?? false}`);
        if (user.profile?.status_text) {
          console.log(`Status:        ${user.profile.status_emoji ?? ""} ${user.profile.status_text}`);
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
