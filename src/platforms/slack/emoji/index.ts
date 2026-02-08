import { defineCommand } from "citty";
import { listCommand } from "./list.ts";

export const emojiCommand = defineCommand({
  meta: { name: "emoji", description: "Manage custom emoji" },
  subCommands: {
    list: listCommand,
  },
});
