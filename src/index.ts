import { defineCommand, runMain } from "citty";
import { slackCommand } from "./platforms/slack/index.ts";

const main = defineCommand({
  meta: {
    name: "holla",
    version: "0.1.0",
    description: "CLI for messaging platforms",
  },
  subCommands: {
    slack: slackCommand,
  },
});

runMain(main);
