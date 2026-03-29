import { WebClient } from "@slack/web-api";
import { LogLevel } from "@slack/web-api";

export function createSlackClient(token: string): WebClient {
  return new WebClient(token, {
    retryConfig: { retries: 3 },
    logLevel: LogLevel.ERROR,
    headers: { "User-Agent": "holla-cli" },
  });
}
