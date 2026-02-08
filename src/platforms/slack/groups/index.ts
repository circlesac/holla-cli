import { defineCommand } from "citty";
import { createCommand } from "./create.ts";
import { listCommand } from "./list.ts";
import { updateCommand } from "./update.ts";
import { enableCommand } from "./enable.ts";
import { disableCommand } from "./disable.ts";
import { membersCommand } from "./members.ts";
import { setMembersCommand } from "./set-members.ts";

export const groupsCommand = defineCommand({
  meta: { name: "groups", description: "Manage user groups" },
  subCommands: {
    create: createCommand,
    list: listCommand,
    update: updateCommand,
    enable: enableCommand,
    disable: disableCommand,
    members: membersCommand,
    "set-members": setMembersCommand,
  },
});
