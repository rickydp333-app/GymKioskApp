const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const asar = require('@electron/asar');

const repoRoot = path.resolve(__dirname, '..');
const packageJson = require(path.join(repoRoot, 'package.json'));
const version = packageJson.version || '0.0.0';
const installsRoot = path.join(repoRoot, '..', 'installs');
const outputDir = path.join(installsRoot, `gymkiosk-install-set-v${version}`);
const zipPath = path.join(installsRoot, `gymkiosk-install-set-v${version}.zip`);

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

function verifyPackagedApp(target) {
  const asarPath = path.join(target.outputDir, 'win-unpacked', 'resources', 'app.asar');
  if (!fs.existsSync(asarPath)) {
    throw new Error(`Packaged app archive not found: ${asarPath}`);
  }

  const files = asar.listPackage(asarPath).map((value) => value.replace(/\\/g, '/'));
  const required = [
    '/server.js',
    '/js/data/exercises.js',
    '/mobile/viewer.html',
    '/assets/branding/logo.png',
    target.name === 'kiosk' ? '/main.js' : '/main-admin.js'
  ];
  const missing = required.filter((entry) => !files.includes(entry));
  const stretchImages = files.filter((entry) => /^\/assets\/stretches\/.+\.png$/i.test(entry));

  if (missing.length) {
    throw new Error(`${target.label} package is missing: ${missing.join(', ')}`);
  }
  if (stretchImages.length < 97) {
    throw new Error(`${target.label} package contains only ${stretchImages.length} stretch images`);
  }

  return { stretchImageCount: stretchImages.length, packagedFileCount: files.length };
}

function cleanTargetBuildArtifacts(target) {
  if (!fs.existsSync(target.outputDir)) return;
  const disposableDirectories = ['win-unpacked', 'win-unpacked-DESKTOP-PFRT1LA'];
  for (const name of disposableDirectories) {
    fs.rmSync(path.join(target.outputDir, name), { recursive: true, force: true });
  }

  for (const name of fs.readdirSync(target.outputDir)) {
    const lowerName = name.toLowerCase();
    const belongsToCurrentVersion = lowerName.includes(`v${version}`) || lowerName.includes(`-${version}-`);
    if (belongsToCurrentVersion && (
      lowerName.endsWith('.exe') ||
      lowerName.endsWith('.exe.blockmap') ||
      lowerName.endsWith('.nsis.7z')
    )) {
      fs.rmSync(path.join(target.outputDir, name), { force: true });
    }
  }
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
    'Supported systems: 64-bit Windows 10 and Windows 11.',
    '',
    'FULL INSTALLATION',
    '1. Run the RDP-GYM Kiosk installer from the kiosk folder.',
    '2. Run the GymKiosk Admin installer from the admin folder.',
    '3. Start RDP-GYM from the desktop or Start menu.',
    '4. The app works offline. Connect the computer to the internet when website synchronization or phone QR access is required.',
    '5. The initial administrator PIN is 3333 and can be changed later from Admin Settings.',
    '',
    'The installers include the complete exercise and stretch image library and all app functions.',
    'The SHA-256 files can be used to confirm that an installer was copied without damage.'
  ];

  fs.writeFileSync(readmePath, `${readmeLines.join('\n')}\n`, 'utf8');
  fs.writeFileSync(manifestPath, `${JSON.stringify({ version, createdAt, entries }, null, 2)}\n`, 'utf8');

  return { readmePath, manifestPath };
}

function createZipBundle() {
  if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
  const result = spawnSync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    '& { param([string]$source, [string]$destination) Compress-Archive -LiteralPath $source -DestinationPath $destination -CompressionLevel Optimal -Force }',
    outputDir,
    zipPath
  ], { cwd: installsRoot, stdio: 'inherit' });

  if (result.status !== 0 || !fs.existsSync(zipPath)) {
    throw new Error('Unable to create the complete install-set ZIP');
  }

  const hash = computeSha256(zipPath);
  const hashPath = `${zipPath}.sha256.txt`;
  fs.writeFileSync(hashPath, `${hash}  ${path.basename(zipPath)}\n`, 'utf8');
  return { zipPath, hash, hashPath };
}

function main() {
  ensureCleanDirectory(outputDir);
  targets.forEach(cleanTargetBuildArtifacts);

  const entries = [];
  for (const target of targets) {
    console.log(`Building ${target.label} installer...`);
    cleanTargetBuildArtifacts(target);
    runBuild(target.config);
    const packageVerification = verifyPackagedApp(target);
    const installerPath = findInstaller(target);
    entries.push({ ...copyInstaller(target, installerPath), packageVerification });
    cleanTargetBuildArtifacts(target);
  }

  const { readmePath, manifestPath } = writeBundleNotes(entries);
  const zipBundle = createZipBundle();

  console.log('Install set ready:');
  console.log(`- folder: ${path.relative(repoRoot, outputDir)}`);
  for (const entry of entries) {
    console.log(`- ${entry.label}: ${path.relative(repoRoot, entry.installerPath)}`);
    console.log(`  sha256: ${entry.hash}`);
  }
  console.log(`- readme: ${path.relative(repoRoot, readmePath)}`);
  console.log(`- manifest: ${path.relative(repoRoot, manifestPath)}`);
  console.log(`- zip: ${path.relative(repoRoot, zipBundle.zipPath)}`);
  console.log(`  sha256: ${zipBundle.hash}`);
}

try {
  main();
} catch (error) {
  console.error(`Release install set failed: ${error.message}`);
  process.exit(1);
}
