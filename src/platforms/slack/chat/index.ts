import { defineCommand } from "citty";
import { sendCommand } from "./send.ts";
import { whisperCommand } from "./whisper.ts";
import { editCommand } from "./edit.ts";
import { deleteCommand } from "./delete.ts";
import { permalinkCommand } from "./permalink.ts";
import { scheduleCommand } from "./schedule.ts";
import { unfurlCommand } from "./unfurl.ts";
import { replyCommand } from "./reply.ts";

export const chatCommand = defineCommand({
  meta: { name: "chat", description: "Send and manage messages" },
  subCommands: {
    send: sendCommand,
    reply: replyCommand,
    whisper: whisperCommand,
    edit: editCommand,
    delete: deleteCommand,
    permalink: permalinkCommand,
    schedule: scheduleCommand,
    unfurl: unfurlCommand,
  },
});
