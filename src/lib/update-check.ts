import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import pkg from "../../package.json";

// ── Per-CLI configuration ──────────────────────────────────────────────────
const REPO = "circlesac/holla-cli";
const CLI_NAME = "holla";
const NPM_PACKAGE = "@circlesac/holla";
const BREW_FORMULA = "circlesac/tap/holla";
// ───────────────────────────────────────────────────────────────────────────

const ENV_PREFIX = CLI_NAME.toUpperCase().replace(/-/g, "_");
const CACHE_DIR = join(homedir(), ".config", CLI_NAME, "cache");
const CACHE_FILE = join(CACHE_DIR, "update-check.json");
const INSTALL_MARKER = `.${CLI_NAME}-install-method`;
const SKIP_ENV = `${ENV_PREFIX}_NO_UPDATE_CHECK`;
const REFRESH_ENV = `${ENV_PREFIX}_INTERNAL_REFRESH`;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

type Source = "homebrew" | "npm" | "standalone" | "unknown";

interface CacheEntry {
  checkedAt: string;
  latest: string;
}

function shouldSkip(): boolean {
  if (process.env[SKIP_ENV]) return true;
  if (process.env.CI) return true;
  const v = (pkg as { version?: string }).version;
  if (!v || v === "0.0.0") return true;
  return false;
}

function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stderr.isTTY);
}

function stripV(v: string): string {
  return v.replace(/^v/, "");
}

function compareVersions(a: string, b: string): number {
  const pa = stripV(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = stripV(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

function detectSource(): Source {
  const exe = process.execPath;
  if (
    exe.includes("/Cellar/") ||
    exe.includes("/Caskroom/") ||
    exe.includes("/opt/homebrew/") ||
    exe.includes("/linuxbrew/") ||
    exe.includes("/Homebrew/")
  ) {
    return "homebrew";
  }
  if (exe.includes("/node_modules/")) return "npm";
  if (existsSync(join(dirname(exe), INSTALL_MARKER))) return "standalone";
  return "unknown";
}

function updateCommand(source: Source): string {
  switch (source) {
    case "homebrew":
      return `brew upgrade ${BREW_FORMULA}`;
    case "npm":
      return `npm update -g ${NPM_PACKAGE}`;
    case "standalone":
      return `curl -fsSL https://github.com/${REPO}/releases/latest/download/install.sh | sh`;
    case "unknown":
      return `https://github.com/${REPO}/releases/latest`;
  }
}

function printBanner(current: string, latest: string, source: Source): void {
  const url = `https://github.com/${REPO}/releases/tag/${latest}`;
  const lines = [
    "",
    `🌱 A new version of ${CLI_NAME} is available:`,
    `   v${stripV(current)} → ${latest}`,
    ``,
    `   Release notes: ${url}`,
    `   To update: ${updateCommand(source)}`,
    "",
  ];
  process.stderr.write(lines.join("\n"));
}

async function readCache(): Promise<CacheEntry | null> {
  try {
    const text = await readFile(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(text) as CacheEntry;
    if (typeof parsed.checkedAt !== "string" || typeof parsed.latest !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(entry: CacheEntry): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(entry));
}

async function fetchLatestTag(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/releases/latest`,
      {
        headers: { "User-Agent": `${CLI_NAME}-cli`, Accept: "application/vnd.github+json" },
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { tag_name?: string };
    return data.tag_name ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function refreshCache(): Promise<void> {
  const latest = await fetchLatestTag();
  if (!latest) return;
  await writeCache({ checkedAt: new Date().toISOString(), latest });
}

function spawnRefresh(): void {
  try {
    const { [REFRESH_ENV]: _ignore, ...rest } = process.env;
    const child = spawn(process.execPath, [], {
      detached: true,
      stdio: "ignore",
      env: { ...rest, [REFRESH_ENV]: "1" },
    });
    child.unref();
  } catch {
    // best-effort; cache will refresh next time
  }
}

function promptYesNo(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    process.stderr.write(`${question} [y/N] `);
    const onData = (chunk: Buffer): void => {
      const answer = chunk.toString().trim().toLowerCase();
      process.stdin.off("data", onData);
      process.stdin.pause();
      resolve(answer === "y" || answer === "yes");
    };
    process.stdin.resume();
    process.stdin.once("data", onData);
  });
}

function execUpdate(source: Source): Promise<number> {
  return new Promise((resolve) => {
    let cmd: string;
    let args: string[] = [];
    let useShell = false;
    switch (source) {
      case "homebrew":
        cmd = "brew";
        args = ["upgrade", BREW_FORMULA];
        break;
      case "npm":
        cmd = "npm";
        args = ["update", "-g", NPM_PACKAGE];
        break;
      case "standalone":
        cmd = `curl -fsSL https://github.com/${REPO}/releases/latest/download/install.sh | sh`;
        useShell = true;
        break;
      default:
        resolve(0);
        return;
    }
    const child = useShell
      ? spawn(cmd, { shell: true, stdio: "inherit" })
      : spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

export async function checkForUpdate(): Promise<void> {
  if (process.env[REFRESH_ENV]) {
    await refreshCache();
    process.exit(0);
  }

  if (shouldSkip()) return;
  const current = (pkg as { version: string }).version;
  const cached = await readCache();
  const stale = !cached ||
    Date.now() - Date.parse(cached.checkedAt) > CHECK_INTERVAL_MS;

  if (cached && compareVersions(cached.latest, current) > 0) {
    const source = detectSource();
    printBanner(current, cached.latest, source);

    if (isInteractive() && source !== "unknown") {
      const yes = await promptYesNo("Update now?");
      if (yes) {
        const code = await execUpdate(source);
        process.exit(code);
      }
    }
  }

  if (stale) spawnRefresh();
}
