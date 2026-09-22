# GymKiosk Watchdog Deployment (Windows Pilot)

This guide sets up automatic restart for both the server and Electron kiosk.

## Option A: PM2 (quickest)

1. Install PM2 globally:
   - `npm install -g pm2`
2. Install local deps in project:
   - `npm install`
3. Start managed processes:
   - `pm2 start ecosystem.config.cjs`
4. Save process list:
   - `pm2 save`
5. Configure startup task:
   - `pm2 startup`
   - Run the command PM2 prints (as Administrator)

Useful commands:
- `pm2 status`
- `pm2 logs gymkiosk-server`
- `pm2 logs gymkiosk-kiosk`
- `pm2 restart all`

## Option B: Task Scheduler + npm start

If you prefer no global PM2 install:

1. Create a Scheduled Task running at startup.
2. Program/script: `cmd.exe`
3. Arguments:
   - `/c cd /d "C:\Users\ricky\OneDrive\Desktop\GymKioskApp" && npm start`
4. Enable:
   - Run whether user is logged in or not (if kiosk account is configured)
   - Restart on failure (Task Settings tab)

## Recommended Pilot Settings

- Auto-login dedicated Windows kiosk user account.
- Disable sleep/hibernate.
- Disable Windows updates during gym hours.
- Keep one spare keyboard with hidden admin access.

## Environment Variables (Ops Quick Reference)

1. Copy `.env.example` to `.env` before production deploys and watchdog automation.
2. Keep local and hosted origins in `ALLOWED_ORIGINS` for QR/mobile access.
3. Tune API traffic safeguards:
   - `API_RATE_LIMIT_WINDOW_MS`
   - `API_RATE_LIMIT_MAX`
4. Tune kiosk recovery behavior:
   - `GYMKIOSK_RESTART_KIOSK_ON_CRASH`
   - `GYMKIOSK_MAX_KIOSK_CRASH_RESTARTS`
   - `GYMKIOSK_KIOSK_RESTART_DELAY_MS`
   - `GYMKIOSK_KIOSK_STABLE_RESET_MS`
   - `GYMKIOSK_KIOSK_HANDOFF_GRACE_MS`
   - `GYMKIOSK_KEEP_SERVER_ON_KIOSK_CRASH`
5. Keep debug/test flags disabled for production kiosk accounts:
   - `GYMKIOSK_SKIP_ELECTRON=0`
   - `GYMKIOSK_TEST_MODE=0`
   - `GYMKIOSK_DEVTOOLS=0`

See `.env.example` for full defaults and SMTP alert settings.
