import { defineCommand } from "citty";
import { getBrowserCredentials } from "../../../lib/credentials.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";
import { callSavedApi } from "./list.ts";

/**
 * Parse a human-readable time expression into a Unix timestamp.
 * Supports:
 *   "30 mins" / "30m", "1 hour" / "1h", "3 hours" / "3h"
 *   "tomorrow" (9:00 AM), "monday" (next Monday 9:00 AM)
 *   "0" or "clear" (returns "0")
 *   Raw Unix timestamp (10-digit number)
 */
export function parseTimeExpression(input: string): string {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === "0" || trimmed === "clear") return "0";

  // Raw Unix timestamp
  if (/^\d{10}$/.test(trimmed)) return trimmed;

  const now = new Date();

  // Relative: "30 mins", "30m", "1 hour", "1h", "3 hours", "3h"
  const relMatch = trimmed.match(/^(\d+)\s*(m(?:ins?)?|h(?:ours?)?|d(?:ays?)?)$/);
  if (relMatch) {
    const n = parseInt(relMatch[1]);
    const unit = relMatch[2][0]; // m, h, or d
    const ms = unit === "m" ? n * 60_000 : unit === "h" ? n * 3_600_000 : n * 86_400_000;
    return String(Math.floor((now.getTime() + ms) / 1000));
  }

  // "tomorrow" → tomorrow at 9:00 AM
  if (trimmed === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return String(Math.floor(d.getTime() / 1000));
  }

  // Day names → next occurrence at 9:00 AM
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayIdx = days.indexOf(trimmed);
  if (dayIdx !== -1) {
    const d = new Date(now);
    let diff = dayIdx - d.getDay();
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    d.setHours(9, 0, 0, 0);
    return String(Math.floor(d.getTime() / 1000));
  }

  // If nothing matched, try as-is (might be a timestamp the user computed)
  if (/^\d+$/.test(trimmed)) return trimmed;

  throw new Error(`Cannot parse time expression: "${input}". Use: 30m, 1h, 3h, tomorrow, monday, or a Unix timestamp`);
}

export const updateCommand = defineCommand({
  meta: { name: "update", description: "Update a Later item (due date, snooze)" },
  args: {
    ...commonArgs,
    "item-id": {
      type: "string",
      description: "Channel ID or item ID",
      required: true,
    },
    ts: {
      type: "string",
      description: "Message timestamp",
      required: true,
    },
    "date-due": {
      type: "string",
      description: "Due date (e.g. 30m, 1h, tomorrow, monday, or Unix timestamp; 0 to clear)",
    },
    snooze: {
      type: "string",
      description: "Snooze (e.g. 30m, 1h, 3h, tomorrow, monday, or Unix timestamp; 0 to clear)",
    },
  },
  async run({ args }) {
    try {
      if (!args["date-due"] && !args.snooze) {
        console.error("At least one of --date-due or --snooze is required");
        process.exit(1);
      }

      const { browserToken, browserCookie, workspace } = await getBrowserCredentials(args.workspace);

      const params: Record<string, string> = {
        item_type: "message",
        item_id: args["item-id"],
        ts: args.ts,
      };

      if (args["date-due"]) params.date_due = parseTimeExpression(args["date-due"]);
      if (args.snooze) params.date_snoozed_until = parseTimeExpression(args.snooze);

      await callSavedApi(workspace, "saved.update", browserToken, browserCookie, params);

      console.log(`\x1b[32m✓\x1b[0m Updated Later item`);
    } catch (error) {
      handleError(error);
    }
  },
});
