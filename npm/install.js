const { execSync } = require("child_process");
const { createWriteStream, existsSync, mkdirSync, chmodSync } = require("fs");
const { join } = require("path");
const https = require("https");

const REPO = "circlesac/holla-cli";
const BIN_DIR = join(__dirname, "bin", "native");
const BIN_PATH = join(BIN_DIR, "holla");

const PLATFORM_MAP = {
  "darwin-arm64": "holla-darwin-arm64",
  "darwin-x64": "holla-darwin-x64",
  "linux-arm64": "holla-linux-arm64",
  "linux-x64": "holla-linux-x64",
};

async function install() {
  if (existsSync(BIN_PATH)) return;

  const platform = `${process.platform}-${process.arch}`;
  const name = PLATFORM_MAP[platform];
  if (!name) {
    console.error(`Unsupported platform: ${platform}`);
    process.exit(1);
  }

  const version = require("./package.json").version;
  const url = `https://github.com/${REPO}/releases/download/v${version}/${name}.tar.gz`;

  mkdirSync(BIN_DIR, { recursive: true });

  console.log(`Downloading holla v${version} for ${platform}...`);
  execSync(`curl -fsSL "${url}" | tar xz -C "${BIN_DIR}"`, { stdio: "inherit" });
  chmodSync(BIN_PATH, 0o755);
  console.log("Installed successfully.");
}

install().catch((err) => {
  console.error("Failed to install holla:", err.message);
  process.exit(1);
});
