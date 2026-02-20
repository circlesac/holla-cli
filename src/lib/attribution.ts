import { execSync } from "node:child_process";
import { readConfig } from "./config.ts";
import type { WebClient } from "@slack/web-api";

const DEFAULT_REACTION = "robot_face";

export function detectAgent(override?: string): string {
  if (override) return override;
  if (process.env.CLAUDECODE === "1") return "claude";
  if (Object.keys(process.env).some((k) => k.startsWith("CURSOR_"))) return "cursor";
  try {
    const name = execSync(`ps -p ${process.ppid} -o comm=`, { encoding: "utf-8" }).trim();
    if (name.includes("claude")) return "claude";
  } catch {}
  return "holla";
}

export function applySuffix(text: string, agent: string, template: string): string {
  const suffix = template.replace(/\{agent\}/g, agent);
  return `${text}\n${suffix}`;
}

export async function addAttributionReaction(
  client: WebClient,
  channel: string,
  ts: string,
  emoji: string,
): Promise<void> {
  try {
    await client.reactions.add({ channel, timestamp: ts, name: emoji });
  } catch {}
}

interface AttributionConfig {
  reaction: string | false;
  suffix: string | false;
  agent: string;
}

interface AttributionArgs {
  agent?: string;
  attribution?: boolean;
  reaction?: boolean;
  suffix?: boolean;
}

export async function getAttributionConfig(args: AttributionArgs): Promise<AttributionConfig> {
  const config = await readConfig();
  const attr = config.slack?.attribution;

  let reaction: string | false = attr?.reaction !== undefined ? attr.reaction : DEFAULT_REACTION;
  let suffix: string | false = attr?.suffix !== undefined ? attr.suffix : false;

  if (args.attribution === false) {
    reaction = false;
    suffix = false;
  } else {
    if (args.reaction === false) reaction = false;
    if (args.suffix === false) suffix = false;
  }

  const agent = detectAgent(args.agent);
  return { reaction, suffix, agent };
}
