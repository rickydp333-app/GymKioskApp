# Render / Public QR Resume Checklist

## Current Confirmed State
- Screensaver is working as requested.
- Screensaver is tutorial-only (no video mode).
- Both tutorial screens are active in rotation.
- Old tutorial page is first in rotation.
- QR/share code is currently forced to local mode (`http://localhost:3001`).
- Render service is live at `https://gymkioskapp.onrender.com`.
- Render currently uses temporary start command that creates placeholder `mobile/*.html` files.

## What To Do Next (When Ready)
1. Push real mobile HTML files to the GitHub repo Render deploys from:
   - `mobile/index.html`
   - `mobile/viewer.html`
   - `mobile/viewer-meal.html`
   - `mobile/favorites.html`
   - `mobile/calendar.html`
   - `mobile/diagnostics.html`
2. In Render service settings, change **Start Command** back to:
   - `node server.js`
3. Trigger **Manual Deploy → Clear build cache & deploy latest commit**.
4. Verify endpoints:
   - `https://gymkioskapp.onrender.com/api/info` (JSON)
   - `https://gymkioskapp.onrender.com/workout/test` (HTML page)
   - `https://gymkioskapp.onrender.com/meal/test` (HTML page)

## DNS / Custom Domain Follow-Up
1. In DNS provider, host `api` must be a single `CNAME` to Render host.
2. Remove any `A`/`AAAA` records for host `api`.
3. Verify `api` custom domain in Render.
4. Test:
   - `https://api.rdpsstrengthandconditioning.ca/api/info`

## Final App Switch (After Public API Is Healthy)
- Switch QR/share base in app back from local-only to confirmed public host.
- Re-test QR scan from phone on a different network.
