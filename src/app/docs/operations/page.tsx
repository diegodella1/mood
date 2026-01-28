'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

type SectionId = 'arch' | 'database' | 'api' | 'cron' | 'push' | 'monitor' | 'troubleshoot' | 'env' | 'deploy';

const sections: { id: SectionId; title: string; icon: string }[] = [
  { id: 'arch', title: 'Architecture', icon: '🏗️' },
  { id: 'database', title: 'Database', icon: '🗄️' },
  { id: 'api', title: 'APIs', icon: '🔌' },
  { id: 'cron', title: 'Cron Jobs', icon: '⏰' },
  { id: 'push', title: 'Push Notif', icon: '🔔' },
  { id: 'monitor', title: 'Monitoring', icon: '📊' },
  { id: 'troubleshoot', title: 'Troubleshoot', icon: '🔧' },
  { id: 'env', title: 'Variables', icon: '🔐' },
  { id: 'deploy', title: 'Deploy', icon: '🚀' },
];

export default function OperationsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('arch');

  return (
    <main className="min-h-screen flex flex-col bg-[#0d1117]">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back</span>
          </Link>
          <h1 className="font-mono text-lg font-bold text-[#c9d1d9]">
            📋 Operations Manual
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="flex-1 flex max-w-6xl mx-auto w-full">
        {/* Sidebar */}
        <nav className="hidden md:flex flex-col w-52 p-4 border-r border-[#30363d] sticky top-14 h-fit">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-all font-mono ${
                activeSection === section.id
                  ? 'bg-[#21262d] text-[#58a6ff] border border-[#30363d]'
                  : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.title}</span>
            </button>
          ))}
        </nav>

        {/* Mobile Nav */}
        <div className="md:hidden sticky top-14 z-40 bg-[#161b22] border-b border-[#30363d] overflow-x-auto">
          <div className="flex p-2 gap-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition-all ${
                  activeSection === section.id
                    ? 'bg-[#21262d] text-[#58a6ff]'
                    : 'text-[#8b949e]'
                }`}
              >
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springSmooth}
              className="prose prose-invert max-w-none"
            >
              {activeSection === 'arch' && <ArchSection />}
              {activeSection === 'database' && <DatabaseSection />}
              {activeSection === 'api' && <ApiSection />}
              {activeSection === 'cron' && <CronSection />}
              {activeSection === 'push' && <PushSection />}
              {activeSection === 'monitor' && <MonitorSection />}
              {activeSection === 'troubleshoot' && <TroubleshootSection />}
              {activeSection === 'env' && <EnvSection />}
              {activeSection === 'deploy' && <DeploySection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold text-[#c9d1d9] mb-6 pb-2 border-b border-[#30363d]">
      {children}
    </h2>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-[#30363d] my-4">
      {title && (
        <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] text-xs text-[#8b949e] font-mono">
          {title}
        </div>
      )}
      <pre className="p-4 bg-[#0d1117] overflow-x-auto">
        <code className="text-sm text-[#c9d1d9] font-mono whitespace-pre">{children}</code>
      </pre>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#161b22]">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2 text-left text-sm font-semibold text-[#c9d1d9] border border-[#30363d]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[#161b22]">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-sm text-[#8b949e] border border-[#30363d] font-mono">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ArchSection() {
  return (
    <div>
      <SectionTitle>🏗️ General Architecture</SectionTitle>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Tech Stack</h3>
      <Table
        headers={['Component', 'Technology']}
        rows={[
          ['Frontend', 'Next.js 14, React 18, Framer Motion'],
          ['Backend', 'Next.js API Routes'],
          ['Database', 'Supabase (PostgreSQL)'],
          ['Push', 'OneSignal'],
          ['Hosting', 'Vercel'],
        ]}
      />

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">File Structure</h3>
      <CodeBlock title="Estructura">{`src/
├── app/
│   ├── api/              # API endpoints
│   │   ├── pulse/        # Submit mood
│   │   ├── friends/      # Social features
│   │   ├── live/         # Real-time counter
│   │   ├── drops/        # Lucky drops
│   │   ├── achievements/ # Secret achievements
│   │   └── cron/         # Scheduled jobs
│   ├── leaderboard/      # Leaderboard page
│   ├── profile/          # User profile
│   ├── guide/            # Game guide
│   └── page.tsx          # Home
├── components/           # React components
├── hooks/               # Custom hooks
├── lib/                 # Utilities
└── providers/           # Context providers`}</CodeBlock>
    </div>
  );
}

function DatabaseSection() {
  return (
    <div>
      <SectionTitle>🗄️ Database</SectionTitle>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Main Tables</h3>
      <Table
        headers={['Table', 'Purpose']}
        rows={[
          ['users', 'Users, streaks, auras, shields'],
          ['pulses', 'Record of each pulse'],
          ['follows', 'Follow relationships'],
          ['friend_streaks', 'Shared streaks'],
          ['active_sessions', 'Active users (live counter)'],
          ['lucky_drops', 'Pending rewards'],
          ['secret_achievements', 'Hidden achievements'],
          ['friend_activity', 'Activity feed'],
          ['referrals', 'Referral system'],
        ]}
      />

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Migrations</h3>
      <CodeBlock title="supabase/migrations/">{`001_initial_schema.sql
006_atomic_functions.sql
009_security_performance.sql
010_viral_features.sql
011_social_features.sql`}</CodeBlock>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Critical Functions</h3>
      <Table
        headers={['Function', 'Usage']}
        rows={[
          ['submit_pulse_atomic()', 'Submit pulse + atomic streak'],
          ['follow_user()', 'Follow + create friend streak'],
          ['update_friend_streaks()', 'Update shared streaks'],
          ['roll_lucky_drop()', '5% chance of reward'],
          ['check_secret_achievements()', 'Check achievements'],
          ['get_live_pulse_count()', 'Active users counter'],
        ]}
      />
    </div>
  );
}

function ApiSection() {
  return (
    <div>
      <SectionTitle>🔌 APIs</SectionTitle>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Main Endpoints</h3>

      <div className="space-y-4">
        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <code className="text-[#7ee787]">POST</code>
          <code className="text-[#c9d1d9] ml-2">/api/pulse</code>
          <p className="text-sm text-[#8b949e] mt-2">
            Submit mood. Returns streak, lucky drop, achievements, context.
          </p>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <code className="text-[#7ee787]">GET/POST/DELETE</code>
          <code className="text-[#c9d1d9] ml-2">/api/friends</code>
          <p className="text-sm text-[#8b949e] mt-2">
            GET: list followers/following. POST: follow. DELETE: unfollow.
          </p>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <code className="text-[#7ee787]">GET</code>
          <code className="text-[#c9d1d9] ml-2">/api/friends/feed</code>
          <p className="text-sm text-[#8b949e] mt-2">
            Friends activity feed (last 24h).
          </p>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <code className="text-[#7ee787]">GET/POST</code>
          <code className="text-[#c9d1d9] ml-2">/api/live</code>
          <p className="text-sm text-[#8b949e] mt-2">
            GET: live counter. POST: session heartbeat.
          </p>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <code className="text-[#7ee787]">GET/POST</code>
          <code className="text-[#c9d1d9] ml-2">/api/drops</code>
          <p className="text-sm text-[#8b949e] mt-2">
            GET: unclaimed drops. POST: claim drop.
          </p>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Rate Limiting</h3>
      <Table
        headers={['Endpoint', 'Limit']}
        rows={[
          ['pulse', '10 req/minute'],
          ['recovery', '5 req/hour'],
          ['reactions', '30 req/minute'],
        ]}
      />
    </div>
  );
}

function CronSection() {
  return (
    <div>
      <SectionTitle>⏰ Cron Jobs</SectionTitle>

      <p className="text-[#8b949e] mb-4">
        Require header <code className="text-[#7ee787]">Authorization: Bearer CRON_SECRET</code>
      </p>

      <Table
        headers={['Endpoint', 'Schedule', 'Description']}
        rows={[
          ['/api/cron/cleanup', '0 * * * *', 'General cleanup'],
          ['/api/cron/nudges', '*/15 * * * *', 'Streak reminders'],
          ['/api/cron/friend-streaks', '0 0 * * *', 'Reset broken streaks'],
          ['/api/cron/cleanup-social', '0 * * * *', 'Clean sessions'],
        ]}
      />

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Vercel Configuration</h3>
      <CodeBlock title="vercel.json">{`{
  "crons": [
    { "path": "/api/cron/cleanup", "schedule": "0 * * * *" },
    { "path": "/api/cron/nudges", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/friend-streaks", "schedule": "0 0 * * *" },
    { "path": "/api/cron/cleanup-social", "schedule": "0 * * * *" }
  ]
}`}</CodeBlock>
    </div>
  );
}

function PushSection() {
  return (
    <div>
      <SectionTitle>🔔 Push Notifications</SectionTitle>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Notification Types</h3>
      <Table
        headers={['Type', 'Trigger', 'Content']}
        rows={[
          ['Window Open', 'Cron nudges', 'The window is now open'],
          ['Streak Risk', 'Cron nudges', 'Your streak is at risk'],
          ['Friend Pulse', 'POST /api/pulse', 'Maria shared her vibe'],
          ['Friend Streak Risk', 'Cron friend-streaks', 'Your streak with X is at risk'],
        ]}
      />

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Android Channels</h3>
      <ul className="list-disc list-inside text-[#8b949e] space-y-1">
        <li><code>default</code> - Windows and general</li>
        <li><code>streak</code> - Streak alerts</li>
        <li><code>friend_activity</code> - Friends activity</li>
      </ul>
    </div>
  );
}

function MonitorSection() {
  return (
    <div>
      <SectionTitle>📊 Monitoring</SectionTitle>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Key Metrics</h3>
      <Table
        headers={['Metric', 'Query/Method']}
        rows={[
          ['DAU', 'SELECT FROM aggregates_global_day'],
          ['Pulses/Window', 'SELECT FROM aggregates_global_window'],
          ['Active Streaks', 'COUNT users WHERE streak_days > 0'],
          ['Friend Streaks', 'COUNT friend_streaks WHERE streak_days > 0'],
          ['Referrals', 'SUM referral_count FROM users'],
        ]}
      />

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Health Checks</h3>
      <CodeBlock title="bash">{`# API health
curl https://your-app.vercel.app/api/pulse -I

# Database: Supabase Dashboard > Logs
# Push: OneSignal Dashboard`}</CodeBlock>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Recommended Alerts</h3>
      <ul className="list-disc list-inside text-[#8b949e] space-y-1">
        <li>Error rate &gt; 1% on /api/pulse</li>
        <li>Latency &gt; 2s on /api/pulse</li>
        <li>Failed cron jobs</li>
        <li>Push delivery rate &lt; 90%</li>
      </ul>
    </div>
  );
}

function TroubleshootSection() {
  return (
    <div>
      <SectionTitle>🔧 Troubleshooting</SectionTitle>

      <div className="space-y-6">
        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <h4 className="font-semibold text-[#f85149] mb-2">&quot;User not found&quot; on pulse</h4>
          <ol className="list-decimal list-inside text-[#8b949e] space-y-1 text-sm">
            <li>Verify userId exists in users table</li>
            <li>Verify /api/users/bootstrap works</li>
          </ol>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <h4 className="font-semibold text-[#f85149] mb-2">Streak not incrementing</h4>
          <ol className="list-decimal list-inside text-[#8b949e] space-y-1 text-sm">
            <li>Check submit_pulse_atomic logs</li>
            <li>Verify no duplicate pulses</li>
            <li>Verify user timezone</li>
          </ol>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <h4 className="font-semibold text-[#f85149] mb-2">Friend streak not updating</h4>
          <ol className="list-decimal list-inside text-[#8b949e] space-y-1 text-sm">
            <li>Verify mutual follow exists</li>
            <li>Verify friend_streaks entry</li>
            <li>Verify update_friend_streaks() executes</li>
          </ol>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <h4 className="font-semibold text-[#f85149] mb-2">Push notifications not arriving</h4>
          <ol className="list-decimal list-inside text-[#8b949e] space-y-1 text-sm">
            <li>Verify OneSignal credentials</li>
            <li>Verify onesignal_player_id in users</li>
            <li>Verify push_opt_in = true</li>
            <li>Check OneSignal dashboard</li>
          </ol>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <h4 className="font-semibold text-[#f85149] mb-2">Lucky drops not showing</h4>
          <ol className="list-decimal list-inside text-[#8b949e] space-y-1 text-sm">
            <li>It&apos;s 5% probability - may take several pulses</li>
            <li>Verify lucky_drops table</li>
            <li>Verify LuckyDropNotification is mounted</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function EnvSection() {
  return (
    <div>
      <SectionTitle>🔐 Environment Variables</SectionTitle>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Required</h3>
      <CodeBlock title=".env">{`# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OneSignal
ONESIGNAL_APP_ID=xxx
ONESIGNAL_REST_API_KEY=xxx
NEXT_PUBLIC_ONESIGNAL_APP_ID=xxx

# Security
CRON_SECRET=your-secure-random-string
ADMIN_TOKEN=your-admin-token

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app`}</CodeBlock>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Optional</h3>
      <CodeBlock title=".env">{`# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXX

# Rate limiting (defaults)
RATE_LIMIT_PULSE=10
RATE_LIMIT_WINDOW_SECONDS=60`}</CodeBlock>
    </div>
  );
}

function DeploySection() {
  return (
    <div>
      <SectionTitle>🚀 Deployment</SectionTitle>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Pre-Deploy Checklist</h3>
      <ul className="space-y-2 text-[#8b949e]">
        {[
          'DB migrations applied',
          'Environment variables configured',
          'OneSignal app created',
          'Cron jobs in vercel.json',
        ].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="w-4 h-4 border border-[#30363d] rounded"></span>
            {item}
          </li>
        ))}
      </ul>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Post-Deploy Checklist</h3>
      <ul className="space-y-2 text-[#8b949e]">
        {[
          'Verify /api/pulse works',
          'Verify push notifications arrive',
          'Verify cron jobs execute',
          'Verify analytics tracking',
        ].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="w-4 h-4 border border-[#30363d] rounded"></span>
            {item}
          </li>
        ))}
      </ul>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Commands</h3>
      <CodeBlock title="bash">{`# Apply migrations
supabase db push

# Deploy to Vercel
vercel --prod

# Verify deploy
curl https://your-app.vercel.app/api/pulse -I`}</CodeBlock>

      <h3 className="text-lg font-semibold text-[#f85149] mt-6 mb-3">Rollback</h3>
      <ol className="list-decimal list-inside text-[#8b949e] space-y-1">
        <li>Revert deployment in Vercel Dashboard</li>
        <li>If DB changes, revert migration manually</li>
        <li>Verify user data was not lost</li>
      </ol>
    </div>
  );
}
