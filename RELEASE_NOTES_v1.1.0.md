# Gym Kiosk v1.1.0

## What changed

- Preserves and automatically migrates existing kiosk JSON data into a local SQLite database.
- Keeps the kiosk working offline and queues website synchronization events until a connection is available.
- Removes face and voice recognition from the interface and packaged application.
- Keeps the initial administrator PIN at `3333`, while allowing it to be changed securely from the admin screen.
- Stores administrator and user PINs as salted password hashes instead of readable text.
- Adds administrator lockout protection, short-lived admin sessions, input validation, security headers, and safer Electron settings.
- Adds website synchronization status and maintenance controls without changing the existing visual design.
- Updates Electron and the build toolchain and resolves all reported dependency vulnerabilities.

## Installers

- Kiosk: `kiosk/RDP-GYM-v1.1.0-Setup.exe`
- Admin: `admin/GymKiosk-Admin-v1.1.0-Setup.exe`

The v1.1.0 install set is located at:

`C:\Users\Rick\OneDrive\Desktop\installs\gymkiosk-install-set-v1.1.0`

## Website synchronization activation

The kiosk side is ready, but live synchronization remains inactive until the updated server is deployed to the website API host and the same `GYMKIOSK_SYNC_KEY` is configured on both sides. The current public API still reports the older v1.0.0 server. Webador can display synchronized information, but a persistent backend database is required to store it reliably.

## Verification

- Complete automated test suite passed.
- Security and legacy-data migration tests passed.
- Source Electron launch and rendered-screen smoke test passed.
- Dependency audit reports zero known vulnerabilities.
- Windows Application Control on the development PC blocked a direct launch of the unsigned unpacked executable. The signed/installed kiosk package should therefore be tested on the kiosk before replacing the current startup version.

## Recovery

The original v1.0.3 source is preserved in Git as tag `baseline-v1.0.3`. Legacy data is copied to a migration backup before conversion.
