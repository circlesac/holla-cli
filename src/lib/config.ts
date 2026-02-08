import { join } from "node:path";
import { homedir } from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { HollaConfig } from "../types/index.ts";

const CONFIG_DIR = join(homedir(), ".config", "holla");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const CACHE_DIR = join(CONFIG_DIR, "cache");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getCacheDir(): string {
  return CACHE_DIR;
}

export async function ensureConfigDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await mkdir(CACHE_DIR, { recursive: true });
}

export async function readConfig(): Promise<HollaConfig> {
  try {
    const content = await readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(content) as HollaConfig;
  } catch {
    return {};
  }
}

export async function writeConfig(config: HollaConfig): Promise<void> {
  await ensureConfigDir();
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}
