import { defineCommand } from "citty";
import { loginCommand } from "./login.ts";
import { logoutCommand } from "./logout.ts";
import { statusCommand } from "./status.ts";

export const authCommand = defineCommand({
  meta: { name: "auth", description: "Manage Slack authentication" },
  subCommands: {
    login: loginCommand,
    logout: logoutCommand,
    status: statusCommand,
  },
});
