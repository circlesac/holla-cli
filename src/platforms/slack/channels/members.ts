import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs, cursorPaginationArgs } from "../../../lib/args.ts";
import { revalidateList, shouldBypassCache } from "../../../lib/cache.ts";
import { rateLimitRetry } from "../../../lib/rate-limit.ts";

export const membersCommand = defineCommand({
  meta: { name: "members", description: "List channel members" },
  args: {
    ...commonArgs,
    ...cursorPaginationArgs,
    channel: {
      type: "string",
      description: "Channel ID or #name",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channelId = await resolveChannel(client, args.channel, workspace);

      const customPagination = Boolean(args.cursor) || Boolean(args.limit);
      const canUseCache = Boolean(args.all) && !customPagination;

      let memberIds: string[];

      if (canUseCache) {
        memberIds = await revalidateList<string>(
          workspace,
          `members-${channelId}`,
          async () => {
            const ids: string[] = [];
            let cursor: string | undefined;
            do {
              const result = await rateLimitRetry(() =>
                client.conversations.members({
                  channel: channelId,
                  limit: 1000,
                  cursor,
                }),
              );
              for (const id of result.members ?? []) ids.push(id);
              cursor = result.response_metadata?.next_cursor || undefined;
            } while (cursor);
            return ids;
          },
          { bypass: shouldBypassCache(args as Record<string, unknown>) },
        );
      } else {
        const limit = args.limit ? parseInt(args.limit, 10) : undefined;
        memberIds = [];
        let cursor: string | undefined = args.cursor;
        do {
          const result = await client.conversations.members({
            channel: channelId,
            limit,
            cursor,
          });
          for (const id of result.members ?? []) memberIds.push(id);
          cursor = result.response_metadata?.next_cursor || undefined;
        } while (args.all && cursor);
      }

      const members = memberIds.map((id) => ({ id }));

      printOutput(members, getOutputFormat(args), [
        { key: "id", label: "Member ID" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
