const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "..", "installs", "dist-admin-installer");
const args = process.argv.slice(2);
const hashOnly = args.includes("--hash-only");

function runBuild() {
  const builderCli = path.join(repoRoot, "node_modules", "electron-builder", "cli.js");
  const buildArgs = [
    builderCli,
    "--win",
    "nsis",
    "--config",
    "admin-builder.json",
    "--config.win.signAndEditExecutable=false"
  ];

  const result = spawnSync(process.execPath, buildArgs, {
    cwd: repoRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function findInstaller() {
  if (!fs.existsSync(outDir)) {
    throw new Error("Output folder not found: ../installs/dist-admin-installer");
  }

  const versionedCandidates = fs
    .readdirSync(outDir)
    .filter((name) => /^GymKiosk-Admin-v.+-Setup\.exe$/i.test(name))
    .map((name) => path.join(outDir, name))
    .map((fullPath) => ({
      fullPath,
      stat: fs.statSync(fullPath)
    }))
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  if (versionedCandidates.length > 0) {
    return versionedCandidates[0].fullPath;
  }

  const candidates = fs
    .readdirSync(outDir)
    .filter((name) => name.toLowerCase().endsWith(".exe") && !name.toLowerCase().includes("unins"))
    .map((name) => path.join(outDir, name))
    .map((fullPath) => ({
      fullPath,
      stat: fs.statSync(fullPath)
    }))
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  if (candidates.length === 0) {
    throw new Error("No installer .exe found in ../installs/dist-admin-installer");
  }

  return candidates[0].fullPath;
}

function computeSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

function writeHashFiles(installerPath, hash) {
  const installerName = path.basename(installerPath);
  const perFileHashPath = path.join(outDir, installerName + ".sha256.txt");
  const latestHashPath = path.join(outDir, "latest-admin-installer-sha256.txt");
  const timestamp = new Date().toISOString();
  const line = `${hash}  ${installerName}`;
  const latestBody = [
    `timestamp=${timestamp}`,
    `file=${installerName}`,
    `sha256=${hash}`,
    line
  ].join("\n");

  fs.writeFileSync(perFileHashPath, line + "\n", "utf8");
  fs.writeFileSync(latestHashPath, latestBody + "\n", "utf8");

  return { perFileHashPath, latestHashPath };
}

function main() {
  if (!hashOnly) {
    console.log("Building admin installer...");
    runBuild();
  }

  const installerPath = findInstaller();
  const hash = computeSha256(installerPath);
  const { perFileHashPath, latestHashPath } = writeHashFiles(installerPath, hash);

  console.log("Admin installer ready:");
  console.log("- installer: " + path.relative(repoRoot, installerPath));
  console.log("- sha256: " + hash);
  console.log("- hash file: " + path.relative(repoRoot, perFileHashPath));
  console.log("- latest hash summary: " + path.relative(repoRoot, latestHashPath));
}

try {
  main();
} catch (error) {
  console.error("Release admin script failed: " + error.message);
  process.exit(1);
}
