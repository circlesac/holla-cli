import { defineCommand } from "citty";
import { allCommand } from "./all.ts";
import { messagesCommand } from "./messages.ts";
import { filesCommand } from "./files.ts";

export const searchCommand = defineCommand({
  meta: { name: "search", description: "Search Slack messages and files" },
  subCommands: {
    all: allCommand,
    messages: messagesCommand,
    files: filesCommand,
  },
});
