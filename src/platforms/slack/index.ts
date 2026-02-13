import { defineCommand } from "citty";
import { authCommand } from "./auth/index.ts";
import { channelsCommand } from "./channels/index.ts";
import { chatCommand } from "./chat/index.ts";
import { reactionsCommand } from "./reactions/index.ts";
import { searchCommand } from "./search/index.ts";
import { usersCommand } from "./users/index.ts";
import { filesCommand } from "./files/index.ts";
import { pinsCommand } from "./pins/index.ts";
import { starsCommand } from "./stars/index.ts";
import { bookmarksCommand } from "./bookmarks/index.ts";
import { remindersCommand } from "./reminders/index.ts";
import { dndCommand } from "./dnd/index.ts";
import { groupsCommand } from "./groups/index.ts";
import { emojiCommand } from "./emoji/index.ts";
import { teamCommand } from "./team/index.ts";
import { canvasesCommand } from "./canvases/index.ts";
import { apiCommand } from "./api.ts";
import { versionCommand } from "./version.ts";

export const slackCommand = defineCommand({
  meta: { name: "slack", description: "Slack platform commands" },
  subCommands: {
    auth: authCommand,
    channels: channelsCommand,
    chat: chatCommand,
    reactions: reactionsCommand,
    search: searchCommand,
    users: usersCommand,
    files: filesCommand,
    pins: pinsCommand,
    stars: starsCommand,
    bookmarks: bookmarksCommand,
    reminders: remindersCommand,
    dnd: dndCommand,
    groups: groupsCommand,
    emoji: emojiCommand,
    team: teamCommand,
    canvases: canvasesCommand,
    api: apiCommand,
    version: versionCommand,
  },
});
