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
