# Windows Installer Release Checklist

Use this checklist before sharing the installer with other computers.

## 1) Build

- Build the full install set:
  - `npm.cmd run release:install-set`
- Confirm output exists:
  - `../installs/gymkiosk-install-set-v1.0.3/`
- That folder should include both installers:
  - `admin/GymKiosk-Admin-v1.0.3-Setup.exe`
  - `kiosk/RDP-GYM-v1.0.3-Setup.exe`

## 2) Package Metadata (recommended)

- Ensure these fields exist in `package.json`:
  - `name`
  - `version`
  - `description`
  - `author`
- Increment `version` for every release.

## 3) Integrity Hash

- Generate SHA256:
  - `certutil -hashfile dist-admin-installer\GymKiosk-Admin-Setup-1.0.0.exe SHA256`
- Publish hash alongside installer so recipients can verify the file.

## 4) Code Signing (strongly recommended)

- Sign the installer with a trusted code-signing certificate.
- Verify signature after signing:
  - `Get-AuthenticodeSignature .\dist-admin-installer\GymKiosk-Admin-Setup-1.0.0.exe | Format-List`
- Unsigned installers can trigger Windows SmartScreen warnings.

## 5) Clean-Machine Install Test

- Test on a different Windows PC or clean VM.
- Install with standard user permissions first (`perMachine` is false in NSIS config).
- Validate:
  - Start Menu shortcut created.
  - Desktop shortcut created.
  - App launches to admin desktop.
  - No missing assets (icons, CSS, JS, videos, data files).

## 6) Network and Runtime Validation

- If mobile features are used, verify `server.js` can run and bind expected port.
- Confirm local firewall rules allow required local network access.
- Verify QR flows from kiosk/admin to phone on the same network.

## 7) Kiosk/Operational Validation

- Confirm intended startup mode on target PC (admin app vs kiosk app).
- Confirm auto-reset, idle/demo behavior, and exit/admin controls work as expected.
- Confirm local data files are readable/writable where needed.

## 8) Distribution Bundle

- Distribute these together:
  - Installer `.exe`
  - SHA256 hash value
  - Release notes (what changed)
  - Known requirements (Windows version, local network expectations)

## 9) Rollback Plan

- Keep previous known-good installer available.
- Keep backup of production data files before upgrading.

## 10) Quick Go/No-Go

- Build succeeds.
- Installer launches and installs on clean machine.
- App launches and core workflows pass.
- Hash and signature verified.
