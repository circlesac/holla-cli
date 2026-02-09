/**
 * Normalize Slack special syntax that gets mangled by shell history expansion.
 * zsh escapes `!` inside `<>`, turning `<!here>` into `<\!here>`.
 * This strips those backslashes so Slack broadcast mentions work correctly.
 */
export function normalizeSlackText(text: string): string {
  return text.replace(/<\\!/g, "<!");
}
