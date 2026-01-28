# Global Pulse

The emotional thermometer of the world. Share how you feel with one tap and see how the planet feels.

## Features

- **3 Daily Windows**: Morning, Afternoon, Night - pulse during each window
- **Streaks & Auras**: Build your streak, unlock Fire (7d), Lightning (30d), Diamond (100d - permanent!)
- **Friends System**: Follow friends, create shared streaks (Snapchat-style)
- **Lucky Drops**: 5% chance per pulse to win shields, special emojis
- **12 Secret Achievements**: Hidden challenges to discover
- **Live Counter**: See who's pulsing right now
- **World Map**: Visualize global emotions in real-time
- **City Leaderboards**: Compete with your city

## Tech Stack

- **Frontend**: Next.js 14, React 18, Framer Motion, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Push Notifications**: OneSignal
- **Maps**: Mapbox GL
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- OneSignal account
- Mapbox account (optional, for maps)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/global-pulse.git
cd global-pulse
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Fill in your `.env.local` with your credentials (see `.env.example` for details)

5. Run database migrations:
```bash
# Using Supabase CLI
npx supabase db push

# Or manually run SQL files from supabase/migrations/ in Supabase SQL Editor
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Database Migrations

Migrations are in `supabase/migrations/`. Run them in order:

1. `001` - Initial schema
2. `006` - Atomic functions
3. `009` - Security & performance
4. `010` - Viral features (referrals, leaderboards)
5. `011` - Social features (friends, streaks, drops, achievements)

## Cron Jobs

Configure in `vercel.json` for production:

```json
{
  "crons": [
    { "path": "/api/cron/cleanup", "schedule": "0 * * * *" },
    { "path": "/api/cron/nudges", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/friend-streaks", "schedule": "0 0 * * *" },
    { "path": "/api/cron/cleanup-social", "schedule": "0 * * * *" }
  ]
}
```

## Admin Panel

Access at `/admin` with your `ADMIN_SECRET`.

Features:
- User management
- Event creation
- City battles
- Push notifications
- System alerts
- Configuration

## Documentation

- `/guide` - Game guide for players
- `/about` - About Global Pulse
- `/docs/operations` - Technical operations manual
- `docs/GAME_GUIDE.md` - Full game documentation
- `docs/OPERATIONS_MANUAL.md` - Ops documentation

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/global-pulse)

1. Connect your GitHub repo
2. Add environment variables in Vercel dashboard
3. Deploy!

## Environment Variables

See `.env.example` for all required variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | Yes | OneSignal App ID |
| `ONESIGNAL_REST_API_KEY` | Yes | OneSignal REST API Key |
| `CRON_SECRET` | Yes | Secret for cron job auth |
| `ADMIN_SECRET` | Yes | Secret for admin panel |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | No | Mapbox token for maps |

## License

MIT
