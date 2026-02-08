import { defineCommand } from "citty";
import { addCommand } from "./add.ts";
import { editCommand } from "./edit.ts";
import { listCommand } from "./list.ts";
import { removeCommand } from "./remove.ts";

export const bookmarksCommand = defineCommand({
  meta: { name: "bookmarks", description: "Manage channel bookmarks" },
  subCommands: {
    add: addCommand,
    edit: editCommand,
    list: listCommand,
    remove: removeCommand,
  },
});
