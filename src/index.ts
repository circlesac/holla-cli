import { defineCommand, runMain } from "citty";
import { slackCommand } from "./platforms/slack/index.ts";
import pkg from "../package.json";

const main = defineCommand({
  meta: {
    name: pkg.name,
    version: pkg.version,
    description: "CLI for messaging platforms",
  },
  subCommands: {
    slack: slackCommand,
  },
});

runMain(main);
