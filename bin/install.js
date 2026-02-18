import https from "https";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPO = "circlesac/holla-cli";

const PLATFORMS = {
  "darwin-x64": { artifact: "holla-darwin-x64", ext: ".tar.gz" },
  "darwin-arm64": { artifact: "holla-darwin-arm64", ext: ".tar.gz" },
  "linux-x64": { artifact: "holla-linux-x64", ext: ".tar.gz" },
  "linux-arm64": { artifact: "holla-linux-arm64", ext: ".tar.gz" },
};

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
  });
}

const nativeDir = path.join(__dirname, "native");
const binPath = path.join(nativeDir, "holla");

if (!fs.existsSync(binPath)) {
  const { version } = require("../package.json");
  if (version) {
    const platform = `${process.platform}-${process.arch}`;
    const info = PLATFORMS[platform];
    if (!info) {
      console.error(`Unsupported platform: ${platform}`);
      process.exit(1);
    }

    const { artifact, ext } = info;
    const url = `https://github.com/${REPO}/releases/download/v${version}/${artifact}${ext}`;
    console.info(`Downloading holla v${version} for ${platform}...`);

    const data = await download(url);
    fs.mkdirSync(nativeDir, { recursive: true });

    const tmp = path.join(nativeDir, `tmp${ext}`);
    fs.writeFileSync(tmp, data);
    execSync(`tar xzf "${tmp}"`, { cwd: nativeDir });
    fs.unlinkSync(tmp);

    fs.chmodSync(binPath, 0o755);
    console.info("Installed successfully.");
  }
}
