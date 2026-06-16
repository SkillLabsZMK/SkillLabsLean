# Skill Labs Finder

A facility-aware web app for dental skill labs (ZMK Tübingen and beyond): room finder, device locator, materials catalogue, cleaning rota, safety rules, and emergency info — all in one single-page app served by a lightweight Node.js backend.

---

## Architecture

```
SkillLabsLean/
├── client/               # Served as static files by Express
│   └── index.html        # SPA — fetches data from /api/data at startup
├── facilities/
│   ├── zmk-tuebingen/    # Per-facility data (checked in without secrets)
│   │   ├── config.json   # Emergency info, plan hotspots, safety rules, putzplan
│   │   ├── rooms/        # One JSON file per room (seminar1.json, technicum.json …)
│   │   ├── areas/        # One JSON file per logical area (lean.json, qual.json …)
│   │   └── materials/
│   │       └── index.json  # Materials catalogue (PIN-protected endpoint)
│   └── template/         # Starting point for a new facility
├── server/
│   ├── server.js         # Express entry point
│   ├── package.json
│   ├── middleware/
│   │   └── requireAuth.js
│   └── routes/
│       ├── api.js        # GET /api/data  (public)  · GET /api/materials (auth)
│       └── auth.js       # POST /auth/login · POST /auth/logout · GET /auth/status
├── .env.example
└── .gitignore
```

---

## Quick Start

### 1. Install dependencies

```bash
cd server
npm install
```

### 2. Set the PIN hash

Generate a bcrypt hash for your chosen PIN:

```bash
node -e "const b=require('bcrypt'); b.hash('1234', 10).then(console.log)"
```

Open `facilities/zmk-tuebingen/config.json` and replace the `pin_hash` value.

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env — set SESSION_SECRET to a long random string
```

### 4. Run

```bash
cd server
npm start          # production
npm run dev        # development (nodemon, auto-reload)
```

Visit http://localhost:3000

---

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/data` | public | Rooms, areas, plan, emergency, safety rules, putzplan |
| GET | `/api/materials` | session | Full materials catalogue |
| POST | `/auth/login` | — | `{ pin }` → sets session cookie |
| POST | `/auth/logout` | — | Destroys session |
| GET | `/auth/status` | — | `{ authenticated: bool }` |

---

## Adding a New Facility

1. Copy `facilities/template/` to `facilities/<facility-id>/`
2. Fill in `config.json` (name, pin_hash, emergency info, …)
3. Add room JSON files to `rooms/` — each file is `{ id, name, devices: [...] }`
4. Add area JSON files to `areas/`
5. Add materials to `materials/index.json`
6. Set `FACILITY=<facility-id>` in your `.env`

---

## Room / Area JSON format

```json
{
  "id": "technicum",
  "name": "Technicum",
  "devices": [
    {
      "name": "Absauganlage",
      "icon": "🌀",
      "note": "Wandmontiert, Südwand"
    }
  ]
}
```

---

## Security notes

- Sessions expire after 8 hours (`maxAge`)
- In production, set `NODE_ENV=production` so the session cookie is `Secure`
- The `pin_hash` uses bcrypt (cost factor 10) — never store the PIN in plaintext
- `helmet` sets security headers; CSP is disabled to allow inline styles (tighten for your deployment)

---

## Deployment (simple VPS)

```bash
# Install Node 20+
# Clone repo, cd into server/, npm install --omit=dev
# Copy .env.example to .env and fill in values
# Run with pm2:
npm install -g pm2
pm2 start server.js --name skilllabs
pm2 save
```

Reverse-proxy with nginx:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```
