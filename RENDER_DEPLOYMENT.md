# Render Deployment (GymKiosk API)

This project is now prepared for Render deployment.

## 1) Deploy the API on Render

1. Push this repo to GitHub.
2. In Render, click **New +** → **Blueprint** (recommended) and select this repo.
3. Render will detect `render.yaml` and create service `gymkiosk-api`.
4. Wait for deploy to finish.

Expected public URL (temporary):
- `https://gymkiosk-api.onrender.com`

## 2) Test API endpoints on Render URL

Open these URLs in browser:
- `https://gymkiosk-api.onrender.com/api/info`
- `https://gymkiosk-api.onrender.com/workout/test`
- `https://gymkiosk-api.onrender.com/meal/test`

`/api/info` should return JSON.

## 3) Connect your custom domain

Target domain:
- `api.rdpsstrengthandconditioning.ca`

In Render service settings:
1. Go to **Settings** → **Custom Domains**.
2. Add `api.rdpsstrengthandconditioning.ca`.
3. Render will show DNS target instructions.

In your DNS provider:
1. Create a `CNAME` record:
   - Host: `api`
   - Value: the Render target hostname shown in dashboard
2. Save and wait for DNS propagation.

Back in Render, verify SSL is issued.

## 4) QR code behavior

The app now defaults to:
- `https://api.rdpsstrengthandconditioning.ca`

QR links and API saves use this base domain.

## 5) Local override (optional)

If needed, in browser devtools console you can override base URL:

```js
localStorage.setItem('gymkiosk_server_base_url', 'https://gymkiosk-api.onrender.com')
```

To clear override:

```js
localStorage.removeItem('gymkiosk_server_base_url')
```

## 6) Important notes

- Render free services can sleep after inactivity (first request may be slow).
- `data/*.json` on Render is ephemeral unless you add persistent storage.
- For production persistence, migrate workout/calendar storage to a database.
