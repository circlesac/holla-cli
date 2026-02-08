import { defineCommand } from "citty";
import { infoCommand } from "./info.ts";
import { profileCommand } from "./profile.ts";

export const teamCommand = defineCommand({
  meta: { name: "team", description: "Get team information" },
  subCommands: {
    info: infoCommand,
    profile: profileCommand,
  },
});
