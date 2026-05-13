import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs, cursorPaginationArgs } from "../../../lib/args.ts";
import {
  rateLimitRetry,
  RateLimitTimeoutError,
} from "../../../lib/rate-limit.ts";
import {
  loadHistoryCache,
  saveHistoryCache,
  shouldBypassCache,
  compareTs,
  pickNewestTs,
} from "../../../lib/cache.ts";

export const historyCommand = defineCommand({
  meta: { name: "history", description: "Fetch channel message history" },
  args: {
    ...commonArgs,
    ...cursorPaginationArgs,
    channel: {
      type: "string",
      description: "Channel ID or #name",
      required: true,
    },
    thread: {
      type: "string",
      description: "Thread timestamp to fetch replies for",
    },
    before: {
      type: "string",
      description: "Only messages before this timestamp (latest)",
    },
    after: {
      type: "string",
      description: "Only messages after this timestamp (oldest)",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channelId = await resolveChannel(client, args.channel, workspace);

      const limit = args.limit ? parseInt(args.limit, 10) : undefined;

      const messages: Record<string, unknown>[] = [];
      let cursor: string | undefined = args.cursor;
      let partial = false;

      // Incremental cache only kicks in for `--all` channel history without
      // explicit time bounds. Threads / bounded queries always hit the API.
      const useHistoryCache =
        !args.thread &&
        Boolean(args.all) &&
        !args.before &&
        !args.after &&
        !args.cursor &&
        !shouldBypassCache(args as Record<string, unknown>);

      const cachedHistory = useHistoryCache
        ? await loadHistoryCache(workspace, channelId)
        : null;

      try {
        if (args.thread) {
          do {
            const result = await rateLimitRetry(() =>
              client.conversations.replies({
                channel: channelId,
                ts: args.thread!,
                ...(limit !== undefined ? { limit } : {}),
                cursor,
              }),
            );

            for (const msg of result.messages ?? []) {
              const entry: Record<string, unknown> = {
                ts: msg.ts ?? "",
                user: msg.user ?? "",
                text: msg.text ?? "",
              };
              if (msg.thread_ts) entry.thread_ts = msg.thread_ts;
              if (msg.reply_count) entry.reply_count = msg.reply_count;
              if (msg.reply_users_count)
                entry.reply_users_count = msg.reply_users_count;
              if (msg.edited) entry.edited = msg.edited;
              if (msg.attachments?.length) entry.attachments = msg.attachments;
              if (msg.files?.length) entry.files = msg.files;
              if (msg.reactions?.length) entry.reactions = msg.reactions;
              messages.push(entry);
            }

            cursor = result.response_metadata?.next_cursor || undefined;
          } while (args.all && cursor);
        } else {
          // If we have a cache, fetch only messages newer than the cached newest ts.
          // Note: edits/deletes on cached messages are not reflected (append-only,
          // by design — issue #24 trade-off).
          const oldest = cachedHistory?.newestTs || args.after;
          do {
            const result = await rateLimitRetry(() =>
              client.conversations.history({
                channel: channelId,
                ...(limit !== undefined ? { limit } : {}),
                cursor,
                latest: args.before,
                oldest,
              }),
            );

            for (const msg of result.messages ?? []) {
              const entry: Record<string, unknown> = {
                ts: msg.ts ?? "",
                user: msg.user ?? "",
                text: msg.text ?? "",
              };
              if (msg.thread_ts) entry.thread_ts = msg.thread_ts;
              if (msg.reply_count) entry.reply_count = msg.reply_count;
              if (msg.reply_users_count)
                entry.reply_users_count = msg.reply_users_count;
              if (msg.edited) entry.edited = msg.edited;
              if (msg.attachments?.length) entry.attachments = msg.attachments;
              if (msg.files?.length) entry.files = msg.files;
              if (msg.reactions?.length) entry.reactions = msg.reactions;
              messages.push(entry);
            }

            cursor = result.response_metadata?.next_cursor || undefined;
          } while (args.all && cursor);
        }
      } catch (error) {
        if (error instanceof RateLimitTimeoutError) {
          partial = true;
        } else {
          throw error;
        }
      }

      if (partial) {
        console.error(
          `\x1b[33m⚠\x1b[0m Rate limit timeout: returning ${messages.length} messages (partial). Use --before with the oldest timestamp to fetch more.`,
        );
        process.exitCode = 1;
      }

      // Merge cached + fresh, persist, return.
      // `messages` already came back newest-first from the API; the cached
      // entries are older, so they go at the end of the timeline.
      let combined = messages;
      if (useHistoryCache) {
        const cachedMessages = cachedHistory?.messages ?? [];
        combined = [...messages, ...cachedMessages];
        if (!partial) {
          const prevNewest = cachedHistory?.newestTs ?? "";
          const fetchedNewest = pickNewestTs(messages, prevNewest);
          const newestTs =
            compareTs(fetchedNewest, prevNewest) >= 0 ? fetchedNewest : prevNewest;
          if (newestTs) {
            await saveHistoryCache(workspace, channelId, combined, newestTs);
          }
        }
      }

      printOutput(combined, getOutputFormat(args), [
        { key: "ts", label: "Timestamp" },
        { key: "user", label: "User" },
        { key: "text", label: "Text" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
