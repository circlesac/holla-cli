import { defineCommand } from "citty";
import { readCommand } from "./read.ts";
import { createCommand } from "./create.ts";
import { addCommand } from "./add.ts";
import { updateCommand } from "./update.ts";
import { deleteCommand } from "./delete.ts";
import { infoCommand } from "./info.ts";

export const listsCommand = defineCommand({
	meta: { name: "lists", description: "Manage Slack Lists" },
	subCommands: {
		read: readCommand,
		info: infoCommand,
		create: createCommand,
		add: addCommand,
		update: updateCommand,
		delete: deleteCommand,
	},
});
