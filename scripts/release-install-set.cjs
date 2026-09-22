const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const packageJson = require(path.join(repoRoot, 'package.json'));
const version = packageJson.version || '0.0.0';
const installsRoot = path.join(repoRoot, '..', 'installs');
const outputDir = path.join(installsRoot, `gymkiosk-install-set-v${version}`);

const targets = [
  {
    name: 'admin',
    config: 'admin-builder.json',
    outputDir: path.join(installsRoot, 'dist-admin-installer'),
    pattern: /^GymKiosk-Admin-v.+-Setup\.exe$/i,
    label: 'GymKiosk Admin'
  },
  {
    name: 'kiosk',
    config: 'kiosk-builder.json',
    outputDir: path.join(installsRoot, 'dist-kiosk-installer'),
    pattern: /^RDP-GYM-v.+-Setup\.exe$/i,
    label: 'RDP-GYM Kiosk'
  }
];

function runBuild(configFile) {
  const builderCli = path.join(repoRoot, 'node_modules', 'electron-builder', 'cli.js');
  const result = spawnSync(process.execPath, [
    builderCli,
    '--win',
    'nsis',
    '--config',
    configFile,
    '--config.win.signAndEditExecutable=false'
  ], {
    cwd: repoRoot,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function findInstaller(target) {
  if (!fs.existsSync(target.outputDir)) {
    throw new Error(`Output folder not found: ${path.relative(repoRoot, target.outputDir)}`);
  }

  const candidates = fs
    .readdirSync(target.outputDir)
    .filter((name) => name.toLowerCase().endsWith('.exe') && !name.toLowerCase().includes('unins') && target.pattern.test(name))
    .map((name) => path.join(target.outputDir, name))
    .map((fullPath) => ({
      fullPath,
      stat: fs.statSync(fullPath)
    }))
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  if (candidates.length === 0) {
    throw new Error(`No installer .exe found in ${path.relative(repoRoot, target.outputDir)}`);
  }

  return candidates[0].fullPath;
}

function computeSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function ensureCleanDirectory(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyInstaller(target, installerPath) {
  const targetDir = path.join(outputDir, target.name);
  fs.mkdirSync(targetDir, { recursive: true });

  const installerName = path.basename(installerPath);
  const copiedInstallerPath = path.join(targetDir, installerName);
  fs.copyFileSync(installerPath, copiedInstallerPath);

  const hash = computeSha256(installerPath);
  const hashFilePath = path.join(targetDir, `${installerName}.sha256.txt`);
  const hashLine = `${hash}  ${installerName}`;
  fs.writeFileSync(hashFilePath, `${hashLine}\n`, 'utf8');

  return {
    target: target.name,
    label: target.label,
    installerName,
    installerPath: copiedInstallerPath,
    hash,
    hashFilePath
  };
}

function writeBundleNotes(entries) {
  const readmePath = path.join(outputDir, 'INSTALL_SET_README.txt');
  const manifestPath = path.join(outputDir, 'install-set-manifest.json');
  const createdAt = new Date().toISOString();
  const readmeLines = [
    'GymKiosk Install Set',
    `Version: ${version}`,
    `Created: ${createdAt}`,
    '',
    'This folder contains the Windows installers for both parts of the app:',
    ...entries.map((entry) => `- ${entry.label}: ${path.join(entry.target, entry.installerName)}`),
    '',
    'Install whichever apps you need on the target machine. For a full deployment, install both.'
  ];

  fs.writeFileSync(readmePath, `${readmeLines.join('\n')}\n`, 'utf8');
  fs.writeFileSync(manifestPath, `${JSON.stringify({ version, createdAt, entries }, null, 2)}\n`, 'utf8');

  return { readmePath, manifestPath };
}

function main() {
  ensureCleanDirectory(outputDir);

  const entries = [];
  for (const target of targets) {
    console.log(`Building ${target.label} installer...`);
    runBuild(target.config);
    const installerPath = findInstaller(target);
    entries.push(copyInstaller(target, installerPath));
  }

  const { readmePath, manifestPath } = writeBundleNotes(entries);

  console.log('Install set ready:');
  console.log(`- folder: ${path.relative(repoRoot, outputDir)}`);
  for (const entry of entries) {
    console.log(`- ${entry.label}: ${path.relative(repoRoot, entry.installerPath)}`);
    console.log(`  sha256: ${entry.hash}`);
  }
  console.log(`- readme: ${path.relative(repoRoot, readmePath)}`);
  console.log(`- manifest: ${path.relative(repoRoot, manifestPath)}`);
}

try {
  main();
} catch (error) {
  console.error(`Release install set failed: ${error.message}`);
  process.exit(1);
}