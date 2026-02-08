import { defineCommand } from "citty";
import { addCommand } from "./add.ts";
import { listCommand } from "./list.ts";
import { removeCommand } from "./remove.ts";

export const starsCommand = defineCommand({
  meta: { name: "stars", description: "Manage starred items" },
  subCommands: {
    add: addCommand,
    list: listCommand,
    remove: removeCommand,
  },
});
