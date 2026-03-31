/**
 * macOS-only: reads browser credentials from the Slack desktop app.
 * - xoxd: decrypts from ~/Library/Application Support/Slack/Cookies (SQLite)
 * - xoxc: extracts from LevelDB local storage, with Snappy decompression for SST files
 *
 * Each workspace's xoxc is stored alongside its domain name in the JSON data.
 * We find the right xoxc by looking for ("domain":"<workspace>") near the token.
 */
import { Database } from "bun:sqlite";
import { readFileSync, readdirSync, copyFileSync, unlinkSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { execSync } from "child_process";
import SnappyJS from "snappyjs";

const SLACK_APP_DIR = join(homedir(), "Library", "Application Support", "Slack");
const COOKIES_DB = join(SLACK_APP_DIR, "Cookies");
const LOCAL_STORAGE_DIR = join(SLACK_APP_DIR, "Local Storage", "leveldb");

// ---------------------------------------------------------------------------
// xoxd: decrypt from Slack Cookies SQLite
// ---------------------------------------------------------------------------

async function decryptSlackCookie(encryptedValue: Uint8Array): Promise<string> {
  const safeStorageKey = execSync('security find-generic-password -s "Slack Safe Storage" -w').toString().trim();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(safeStorageKey),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-1",
      salt: new TextEncoder().encode("saltysalt"),
      iterations: 1003,
    },
    keyMaterial,
    128,
  );

  const derivedKey = await crypto.subtle.importKey(
    "raw",
    derivedBits,
    { name: "AES-CBC" },
    false,
    ["decrypt"],
  );

  const ciphertext = encryptedValue.slice(3); // skip "v10" prefix
  const iv = new Uint8Array(16).fill(0x20); // 16 space chars

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    derivedKey,
    ciphertext,
  );

  const text = new TextDecoder("utf-8", { fatal: false }).decode(decrypted);
  const match = text.match(/xoxd-[A-Za-z0-9%_.~-]+/);
  if (!match) throw new Error("xoxd token not found in decrypted cookie");
  return match[0];
}

async function readXoxdFromSlackApp(): Promise<string> {
  const tmpDb = join(tmpdir(), `slack-cookies-${Date.now()}.db`);
  copyFileSync(COOKIES_DB, tmpDb);
  try {
    const db = new Database(tmpDb, { readonly: true });
    const row = db
      .query("SELECT encrypted_value FROM cookies WHERE name = 'd' AND host_key = '.slack.com' LIMIT 1")
      .get() as { encrypted_value: Uint8Array } | null;
    db.close();
    if (!row) throw new Error("Slack 'd' cookie not found");
    return await decryptSlackCookie(row.encrypted_value);
  } finally {
    try { unlinkSync(tmpDb); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// xoxc: parse LevelDB (with Snappy decompression for SST files)
// ---------------------------------------------------------------------------

const SST_MAGIC = new Uint8Array([0x57, 0xfb, 0x80, 0x8b, 0x24, 0x75, 0x47, 0xdb]);

function readVarint(data: Uint8Array, pos: number): [number, number] {
  let result = 0, shift = 0;
  while (pos < data.length) {
    const b = data[pos++];
    result |= (b & 0x7f) << shift;
    if (!(b & 0x80)) break;
    shift += 7;
  }
  return [result, pos];
}

function snappyDecompress(data: Uint8Array): Uint8Array {
  try {
    return new Uint8Array(SnappyJS.uncompress(data));
  } catch {
    return data;
  }
}

function extractTokens(raw: Uint8Array): Array<{ domain: string | null; xoxc: string }> {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(raw);
  const results: Array<{ domain: string | null; xoxc: string }> = [];
  const re = /xoxc-[0-9a-f-]{40,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = Math.max(0, m.index - 1000);
    const ctx = text.slice(start, m.index);
    const dm = ctx.match(/"domain"\s*:\s*"([^"]+)"/);
    results.push({ domain: dm ? dm[1] : null, xoxc: m[0] });
  }
  return results;
}

function parseSstFile(data: Uint8Array): Array<{ domain: string | null; xoxc: string }> {
  // Check SST magic at end of file
  const tail = data.slice(data.length - 8);
  if (!SST_MAGIC.every((v, i) => v === tail[i])) {
    // Not a valid SST file (or a log file) — raw scan
    return extractTokens(data);
  }

  const results: Array<{ domain: string | null; xoxc: string }> = [];

  // Parse SST footer (last 48 bytes before magic)
  const footer = data.slice(data.length - 48);
  let pos = 0;
  let metaOffset: number, metaSize: number, idxOffset: number, idxSize: number;
  [metaOffset, pos] = readVarint(footer, pos);
  [metaSize, pos] = readVarint(footer, pos);
  [idxOffset, pos] = readVarint(footer, pos);
  [idxSize, pos] = readVarint(footer, pos);

  // Read index block
  let idxData = data.slice(idxOffset, idxOffset + idxSize);
  const idxType = idxOffset + idxSize < data.length ? data[idxOffset + idxSize] : 0;
  if (idxType === 1) idxData = snappyDecompress(idxData);

  // Parse index entries to find data block handles
  const view = new DataView(idxData.buffer, idxData.byteOffset, idxData.byteLength);
  const restartsSize = idxData.length >= 4 ? view.getUint32(idxData.length - 4, true) : 0;
  const numRestarts = Math.min(restartsSize, 1000);
  const limit = idxData.length - (numRestarts + 1) * 4 - 4;
  const blockHandles: Array<[number, number]> = [];

  pos = 0;
  while (pos < limit) {
    try {
      let shared: number, nonShared: number, valLen: number;
      [shared, pos] = readVarint(idxData, pos);
      [nonShared, pos] = readVarint(idxData, pos);
      [valLen, pos] = readVarint(idxData, pos);
      pos += nonShared; // skip key
      const value = idxData.slice(pos, pos + valLen);
      pos += valLen;
      let vpos = 0;
      let blkOffset: number, blkSize: number;
      [blkOffset, vpos] = readVarint(value, vpos);
      [blkSize] = readVarint(value, vpos);
      blockHandles.push([blkOffset, blkSize]);
    } catch {
      break;
    }
  }

  // Read data blocks and extract tokens
  for (const [blkOffset, blkSize] of blockHandles) {
    let raw = data.slice(blkOffset, blkOffset + blkSize);
    const typ = blkOffset + blkSize < data.length ? data[blkOffset + blkSize] : 0;
    if (typ === 1) raw = snappyDecompress(raw);
    // Quick check before expensive text decode
    let hasToken = false;
    for (let i = 0; i < raw.length - 4; i++) {
      if (raw[i] === 0x78 && raw[i+1] === 0x6f && raw[i+2] === 0x78 && raw[i+3] === 0x63) {
        hasToken = true;
        break;
      }
    }
    if (hasToken) results.push(...extractTokens(raw));
  }

  return results;
}

function readAllXoxcFromLevelDB(): Map<string, string> {
  const domainTokens = new Map<string, string>();

  try {
    const files = readdirSync(LOCAL_STORAGE_DIR)
      .filter((f) => f.endsWith(".ldb") || f.endsWith(".log"))
      .sort(); // ascending = oldest first, newer files overwrite

    for (const file of files) {
      const filePath = join(LOCAL_STORAGE_DIR, file);
      try {
        const data = new Uint8Array(readFileSync(filePath));
        const entries = parseSstFile(data);
        for (const entry of entries) {
          if (entry.domain) {
            domainTokens.set(entry.domain, entry.xoxc);
          } else if (!domainTokens.has("__unknown__")) {
            domainTokens.set("__unknown__", entry.xoxc);
          }
        }
      } catch { /* ignore per-file errors */ }
    }
  } catch { /* ignore */ }

  return domainTokens;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns { xoxc, xoxd } for the given workspace domain, or null if unavailable.
 * Only works on macOS with the Slack desktop app installed.
 */
export async function readSlackDesktopCredentials(domain?: string): Promise<
  { xoxc: string; xoxd: string } | null
> {
  if (process.platform !== "darwin") return null;

  try {
    const [xoxd, tokenMap] = await Promise.all([
      readXoxdFromSlackApp(),
      Promise.resolve(readAllXoxcFromLevelDB()),
    ]);

    let xoxc: string | undefined;
    if (domain) {
      xoxc = tokenMap.get(domain) ?? tokenMap.get("__unknown__");
    } else {
      // No domain specified — return the most recently active token
      xoxc = [...tokenMap.values()].at(-1);
    }

    if (!xoxd || !xoxc) return null;
    return { xoxc, xoxd };
  } catch {
    return null;
  }
}
