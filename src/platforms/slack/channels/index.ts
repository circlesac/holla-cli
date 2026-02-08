import { defineCommand } from "citty";
import { listCommand } from "./list.ts";
import { infoCommand } from "./info.ts";
import { createCommand } from "./create.ts";
import { historyCommand } from "./history.ts";
import { repliesCommand } from "./replies.ts";
import { archiveCommand } from "./archive.ts";
import { unarchiveCommand } from "./unarchive.ts";
import { joinCommand } from "./join.ts";
import { leaveCommand } from "./leave.ts";
import { inviteCommand } from "./invite.ts";
import { kickCommand } from "./kick.ts";
import { membersCommand } from "./members.ts";
import { markReadCommand } from "./mark-read.ts";
import { topicCommand } from "./topic.ts";
import { purposeCommand } from "./purpose.ts";

export const channelsCommand = defineCommand({
  meta: { name: "channels", description: "Manage Slack channels" },
  subCommands: {
    list: listCommand,
    info: infoCommand,
    create: createCommand,
    history: historyCommand,
    replies: repliesCommand,
    archive: archiveCommand,
    unarchive: unarchiveCommand,
    join: joinCommand,
    leave: leaveCommand,
    invite: inviteCommand,
    kick: kickCommand,
    members: membersCommand,
    "mark-read": markReadCommand,
    topic: topicCommand,
    purpose: purposeCommand,
  },
});
