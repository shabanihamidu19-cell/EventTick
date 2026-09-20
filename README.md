# EventTick

**Production-ready cross-platform event ticketing platform**  
Web (responsive) + PWA-ready for mobile. Buy tickets with Mobile Money, receive QR passes, scan at the door, and auto-payout organizers after events expire.

---

## Features

| Feature | Description |
|--------|-------------|
| **Public discovery feed** | Social-style feed filtered by city & category (Music, Business, Sports, Campus…) |
| **Unique event links** | Shareable URLs: `/e/afrobeats2026` |
| **Mobile Money STK Push** | Modular payment gateway (AzamPay / ClickPesa / Selcom style) |
| **QR tickets** | Signed QR codes, downloadable, SMS/WhatsApp delivery |
| **Door scanner** | Camera-based QR scanner with success/fail beeps |
| **Event lifecycle** | `UPCOMING` → `LIVE` → `EXPIRED` via cron |
| **Automated payouts** | On expiry: revenue − platform commission → organizer Mobile Money |
| **Roles** | Customer dashboard (My Tickets) & Organizer dashboard (create, analytics, scanner) |
| **Auth** | Phone + OTP (JWT). Social login placeholders in `.env` |

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Framer Motion, Lucide Icons
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (jose) + OTP
- **QR:** `qrcode` + HMAC-signed payloads
- **Scanner:** `html5-qrcode`
- **Payments / SMS / WhatsApp:** Fully modular via environment variables

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+ (local or cloud, e.g. Neon, Supabase, Railway)

### 2. Clone & install

```bash
git clone https://github.com/shabanihamidu19-cell/EventTick.git
cd EventTick
cp .env.example .env
npm install
```

### 3. Configure environment

Edit `.env` and set at minimum:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/eventtick?schema=public"
JWT_SECRET="generate-with-openssl-rand-base64-32"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

When payment keys are placeholders, the app runs in **simulation mode**.

### 4. Database setup

```bash
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000

### Demo accounts (after seed)

| Role | Phone |
|------|-------|
| Customer | `+255712345678` |
| Organizer | `+255723456789` |

OTP codes are printed in the server terminal in development.

---

## License

MIT – build and ship freely.
