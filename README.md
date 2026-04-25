# PEAK '25 Meetup — Registration & Ticketing System

A full-stack registration and QR ticketing system built with React + TypeScript + Supabase.

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Attendee registration form + payment slip upload |
| `/status` | Check ticket status by email, view QR code |
| `/admin` | Admin dashboard — approve / reject registrations |
| `/scan` | QR scanner for event entry check-in |

---

## Setup (Step by Step)

### 1. Create Supabase Project
- Go to https://supabase.com and create a new project
- Copy your **Project URL** and **anon public key** from Settings → API

### 2. Run the SQL Schema
- Go to Supabase → SQL Editor
- Paste the entire contents of `schema.sql` and run it

### 3. Create Admin Account
- Go to Supabase → Authentication → Users → Add User
- Create a user with email/password (this is the admin login for `/admin`)

### 4. Configure Environment Variables
```bash
cp .env.example .env
```
Fill in:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_SCANNER_PASSWORD=your-secret-scanner-password
```

### 5. Install and Run
```bash
npm install
npm run dev
```

### 6. Deploy to Vercel
```bash
npm run build
# Then push to GitHub and connect repo to Vercel
# Add env variables in Vercel Dashboard → Settings → Environment Variables
```

---

## How It Works

### Attendee Flow
1. Fills registration form at `/`
2. Uploads payment slip (stored in Supabase Storage)
3. Gets "pending" status
4. Admin reviews and approves
5. Attendee checks `/status` with email → sees QR code ticket

### Admin Flow
1. Logs in at `/admin` with Supabase credentials
2. Views all registrations with stats
3. Clicks "Review →" on any registration
4. Views payment slip image
5. Approves (generates QR) or Rejects (with optional note)

### Check-in Flow
1. Open `/scan` on a phone/tablet at event entrance
2. Enter scanner password
3. Start camera → scan attendee's QR
4. System validates ticket, marks as checked in
5. Shows attendee name, food preference, and result

---

## Dependencies
- `@supabase/supabase-js` — database + auth + storage
- `react-router-dom` — page routing
- `qrcode.react` — QR code generation (on StatusPage)
- `html5-qrcode` — camera QR scanning (on ScannerPage)
