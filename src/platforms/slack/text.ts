/**
 * Normalize Slack-specific syntax in user input before markdown processing.
 *
 * 1. Fixes zsh history expansion: `<\!here>` → `<!here>`
 * 2. Converts Slack mrkdwn links to standard markdown: `<url|text>` → `[text](url)`
 *    (Only matches http/https URLs — user/channel mentions are preserved.)
 */
export function normalizeSlackText(text: string): string {
  return text
    .replace(/<\\!/g, "<!")
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, "[$2]($1)");
}

/**
 * Sanitize markdown for Slack Canvas API compatibility.
 *
 * The Canvas API rejects mixed nested lists (numbered items with bullet
 * sub-items). This converts bullet sub-items under numbered parents into
 * numbered sub-items, which the API accepts.
 */
export function sanitizeCanvasMarkdown(md: string): { markdown: string; modified: boolean } {
  const lines = md.split("\n");
  const result: string[] = [];
  let inNumberedList = false;
  let subCounter = 0;
  let modified = false;

  for (const line of lines) {
    if (/^\d+\.\s/.test(line)) {
      inNumberedList = true;
      subCounter = 0;
      result.push(line);
    } else if (inNumberedList && /^(\s+)-\s/.test(line)) {
      subCounter++;
      const match = line.match(/^(\s+)-\s(.*)$/);
      if (match) {
        result.push(`${match[1]}${subCounter}. ${match[2]}`);
        modified = true;
      } else {
        result.push(line);
      }
    } else {
      if (line !== "" && !/^\s/.test(line) && !/^\d+\.\s/.test(line)) {
        inNumberedList = false;
      }
      result.push(line);
    }
  }

  return { markdown: result.join("\n"), modified };
}
