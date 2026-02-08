import { defineCommand } from "citty";
import { addCommand } from "./add.ts";
import { removeCommand } from "./remove.ts";
import { getCommand } from "./get.ts";
import { listCommand } from "./list.ts";

export const reactionsCommand = defineCommand({
  meta: { name: "reactions", description: "Manage Slack reactions" },
  subCommands: {
    add: addCommand,
    remove: removeCommand,
    get: getCommand,
    list: listCommand,
  },
});
