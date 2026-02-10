import { defineCommand } from "citty";
import { uploadCommand } from "./upload.ts";
import { listCommand } from "./list.ts";
import { infoCommand } from "./info.ts";
import { deleteCommand } from "./delete.ts";
import { downloadCommand } from "./download.ts";

export const filesCommand = defineCommand({
  meta: { name: "files", description: "Manage files" },
  subCommands: {
    upload: uploadCommand,
    list: listCommand,
    info: infoCommand,
    delete: deleteCommand,
    download: downloadCommand,
  },
});
