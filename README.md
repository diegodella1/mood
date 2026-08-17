# Global Pulse

The emotional thermometer of the world. Share how you feel with one tap and see how the planet feels.

## Features

- **3 Daily Windows**: Morning, Afternoon, Night — pulse during each window
- **Streaks & Auras**: Build your streak, unlock Fire (7d), Lightning (30d), Diamond (100d)
- **Friends System**: Follow friends, create shared streaks
- **Lucky Drops**: Chance per pulse to win shields or special emojis
- **Secret Achievements**: Hidden challenges to discover
- **Live Counter**: See who's pulsing right now
- **World Map**: Visualize global emotions
- **City Leaderboards**: Compete with your city

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Framer Motion, SWR
- **Backend**: Next.js Route Handlers, Supabase (PostgreSQL + RLS)
- **Auth**: Signed HttpOnly session cookie (anonymous users) + email verification for recovery
- **Push Notifications**: OneSignal
- **Maps**: Mapbox GL
- **Hosting**: Vercel (or Docker / self-hosted)

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project
- OneSignal app
- Mapbox token (optional, for maps)
- Resend API key (optional locally, required for email recovery in production)

### Installation

```bash
git clone https://github.com/your-username/global-pulse.git
cd global-pulse
npm install
cp .env.example .env.local
```

Fill `.env.local` (see `.env.example`). Generate secrets with `openssl rand -hex 32`.

Run database migrations:

```bash
npx supabase db push
# or run SQL files from supabase/migrations/ in order in the Supabase SQL Editor
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |

## Database Migrations

Migrations live in `supabase/migrations/` and run in numeric order (`001` … `019`).

`019_rls_and_session_hardening.sql` is required after this release: it tightens RLS, protects recovery codes, and revokes dangerous `anon` RPC grants.

## Identity & Security

- User identity is a **signed HttpOnly cookie** (`gp_session`), not a client-supplied UUID.
- Existing users are migrated once from `localStorage` if that UUID already exists in the database.
- Email must be **verified** before it can be used for account recovery.
- Recovery codes are 8-character, hashed at rest, and rate-limited by IP.
- Admin uses an HttpOnly cookie (`gp_admin`) issued by `POST /api/admin/session`.
- Cron and internal notification routes require `Authorization: Bearer CRON_SECRET`.

## Cron Jobs

Configured in `vercel.json` (12 jobs): `tick-5m`, `tick-10m`, `tick-15m`, `nudges`, `custom-windows`, `cleanup`, `cleanup-social`, `friend-streaks`, `battles`, `flips`, `shifts`, `escalation`.

## Admin Panel

Access `/admin/login` and sign in with `ADMIN_SECRET`. The secret is never stored in `localStorage`.

## Documentation

- `/guide` — Game guide
- `/about` — About Global Pulse
- `/docs/operations` — Operations notes
- `docs/GAME_GUIDE.md` — Full game documentation
- `docs/OPERATIONS_MANUAL.md` — Ops documentation

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | Yes | OneSignal App ID |
| `ONESIGNAL_REST_API_KEY` | Yes | OneSignal REST API key |
| `CRON_SECRET` | Yes | Secret for cron + internal routes (min 32 chars) |
| `ADMIN_SECRET` | Yes | Secret for admin login (min 32 chars) |
| `SESSION_SECRET` | Recommended | Signs user/admin cookies (falls back to `CRON_SECRET`) |
| `RESEND_API_KEY` | Prod | Sends verification and recovery emails |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | No | Mapbox token for maps |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL |

## License

MIT
