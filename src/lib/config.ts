import { join } from "node:path";
import { homedir } from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { HollaConfig } from "../types/index.ts";

// Resolve paths lazily so tests that stub HOME via vi.stubEnv between imports
// see the override. (Module-level constants captured homedir() at import time
// and ignored test-time overrides.)
export function getConfigDir(): string {
  return join(homedir(), ".config", "holla");
}

export function getCacheDir(): string {
  return join(getConfigDir(), "cache");
}

function getConfigFile(): string {
  return join(getConfigDir(), "config.json");
}

export async function ensureConfigDir(): Promise<void> {
  await mkdir(getConfigDir(), { recursive: true });
  await mkdir(getCacheDir(), { recursive: true });
}

export async function readConfig(): Promise<HollaConfig> {
  try {
    const content = await readFile(getConfigFile(), "utf-8");
    return JSON.parse(content) as HollaConfig;
  } catch {
    return {};
  }
}

export async function writeConfig(config: HollaConfig): Promise<void> {
  await ensureConfigDir();
  await writeFile(getConfigFile(), JSON.stringify(config, null, 2) + "\n");
}
