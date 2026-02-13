export class HollaError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "HollaError";
  }
}

export class AuthError extends HollaError {
  constructor(message: string) {
    super(message, "AUTH_ERROR");
    this.name = "AuthError";
  }
}

export class SlackApiError extends HollaError {
  constructor(
    message: string,
    public slackError?: string,
  ) {
    super(message, "SLACK_API_ERROR");
    this.name = "SlackApiError";
  }
}

export function handleError(error: unknown): never {
  if (error instanceof HollaError) {
    console.error(`\x1b[31m✗\x1b[0m ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`\x1b[31m✗\x1b[0m ${error.message}`);
    const data = (error as { data?: { needed?: string; provided?: string } }).data;
    if (data?.needed) {
      console.error(`  Needed: ${data.needed}`);
      if (data.provided) console.error(`  Provided: ${data.provided}`);
    }
  } else {
    console.error(`\x1b[31m✗\x1b[0m An unknown error occurred`);
  }
  process.exit(1);
}
