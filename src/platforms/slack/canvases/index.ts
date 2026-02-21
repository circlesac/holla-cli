import { defineCommand } from "citty";
import { createCommand } from "./create.ts";
import { editCommand } from "./edit.ts";
import { deleteCommand } from "./delete.ts";
import { accessSetCommand } from "./access-set.ts";
import { accessDeleteCommand } from "./access-delete.ts";
import { sectionsCommand } from "./sections.ts";
import { readCommand } from "./read.ts";

export const canvasesCommand = defineCommand({
  meta: { name: "canvases", description: "Manage canvases" },
  subCommands: {
    create: createCommand,
    edit: editCommand,
    delete: deleteCommand,
    read: readCommand,
    "access-set": accessSetCommand,
    "access-delete": accessDeleteCommand,
    sections: sectionsCommand,
  },
});
