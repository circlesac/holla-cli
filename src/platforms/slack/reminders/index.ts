import { defineCommand } from "citty";
import { addCommand } from "./add.ts";
import { listCommand } from "./list.ts";
import { infoCommand } from "./info.ts";
import { completeCommand } from "./complete.ts";
import { deleteCommand } from "./delete.ts";

export const remindersCommand = defineCommand({
  meta: { name: "reminders", description: "Manage Slack reminders" },
  subCommands: {
    add: addCommand,
    list: listCommand,
    info: infoCommand,
    complete: completeCommand,
    delete: deleteCommand,
  },
});
