import { defineCommand } from "citty";
import { addCommand } from "./add.ts";
import { listCommand } from "./list.ts";
import { removeCommand } from "./remove.ts";

export const pinsCommand = defineCommand({
  meta: { name: "pins", description: "Manage pinned messages" },
  subCommands: {
    add: addCommand,
    list: listCommand,
    remove: removeCommand,
  },
});
