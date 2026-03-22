import { defineCommand } from "citty";
import { listCommand } from "./list.ts";
import { removeCommand } from "./remove.ts";
import { addCommand } from "./add.ts";
import { updateCommand } from "./update.ts";

export const laterCommand = defineCommand({
  meta: { name: "later", description: "Manage Slack Later (saved items) via browser session" },
  subCommands: {
    list: listCommand,
    remove: removeCommand,
    add: addCommand,
    update: updateCommand,
  },
});
