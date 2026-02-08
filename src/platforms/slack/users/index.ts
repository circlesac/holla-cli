import { defineCommand } from "citty";
import { listCommand } from "./list.ts";
import { infoCommand } from "./info.ts";
import { findCommand } from "./find.ts";
import { presenceCommand } from "./presence.ts";
import { setPresenceCommand } from "./set-presence.ts";
import { profileCommand } from "./profile.ts";
import { setProfileCommand } from "./set-profile.ts";

export const usersCommand = defineCommand({
  meta: { name: "users", description: "Manage Slack users" },
  subCommands: {
    list: listCommand,
    info: infoCommand,
    find: findCommand,
    presence: presenceCommand,
    "set-presence": setPresenceCommand,
    profile: profileCommand,
    "set-profile": setProfileCommand,
  },
});
