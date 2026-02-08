import { defineCommand } from "citty";
import { statusCommand } from "./status.ts";
import { snoozeCommand } from "./snooze.ts";
import { unsnoozeCommand } from "./unsnooze.ts";
import { endCommand } from "./end.ts";
import { teamCommand } from "./team.ts";

export const dndCommand = defineCommand({
  meta: { name: "dnd", description: "Manage Do Not Disturb settings" },
  subCommands: {
    status: statusCommand,
    snooze: snoozeCommand,
    unsnooze: unsnoozeCommand,
    end: endCommand,
    team: teamCommand,
  },
});
