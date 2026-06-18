import { defineCommand, runMain } from "citty";
import { slackCommand } from "./platforms/slack/index.ts";
import { checkForUpdate } from "./lib/update-check.ts";
import { validateKnownFlags } from "./lib/validate-flags.ts";
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

// citty 는 모르는 플래그를 조용히 무시(strict:false) → 오타/없는 옵션이 의도와 다른 동작을 일으킴(예: chat send --thread-ts). 실행 전 거부.
validateKnownFlags(main as Parameters<typeof validateKnownFlags>[0], process.argv.slice(2));
await checkForUpdate();
runMain(main);
