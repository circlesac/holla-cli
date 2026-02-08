import { defineCommand } from "citty";
import { removeWorkspace, listWorkspaces } from "../../../lib/credentials.ts";

export const logoutCommand = defineCommand({
  meta: { name: "logout", description: "Remove stored Slack credentials" },
  args: {
    workspace: {
      type: "string",
      description: "Workspace name to remove",
    },
  },
  async run({ args }) {
    let workspace = args.workspace;

    if (!workspace) {
      const workspaces = await listWorkspaces();
      if (workspaces.length === 0) {
        console.log("No workspaces configured.");
        return;
      }
      if (workspaces.length === 1) {
        workspace = workspaces[0]!.name;
      } else {
        console.error(
          `\x1b[31m✗\x1b[0m Multiple workspaces found. Specify one with --workspace: ${workspaces.map((w) => w.name).join(", ")}`,
        );
        process.exit(1);
      }
    }

    const removed = await removeWorkspace(workspace);
    if (removed) {
      console.log(`\x1b[32m✓\x1b[0m Credentials removed for "${workspace}"`);
    } else {
      console.error(`\x1b[31m✗\x1b[0m Workspace "${workspace}" not found`);
      process.exit(1);
    }
  },
});
