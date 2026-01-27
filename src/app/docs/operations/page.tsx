'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

type SectionId = 'arch' | 'database' | 'api' | 'cron' | 'push' | 'monitor' | 'troubleshoot' | 'env' | 'deploy';

const sections: { id: SectionId; title: string; icon: string }[] = [
  { id: 'arch', title: 'Arquitectura', icon: '🏗️' },
  { id: 'database', title: 'Base de Datos', icon: '🗄️' },
  { id: 'api', title: 'APIs', icon: '🔌' },
  { id: 'cron', title: 'Cron Jobs', icon: '⏰' },
  { id: 'push', title: 'Push Notif', icon: '🔔' },
  { id: 'monitor', title: 'Monitoreo', icon: '📊' },
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
            <span className="text-sm">Volver</span>
          </Link>
          <h1 className="font-mono text-lg font-bold text-[#c9d1d9]">
            📋 Manual de Operaciones
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
      <SectionTitle>🏗️ Arquitectura General</SectionTitle>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Stack Tecnológico</h3>
      <Table
        headers={['Componente', 'Tecnología']}
        rows={[
          ['Frontend', 'Next.js 14, React 18, Framer Motion'],
          ['Backend', 'Next.js API Routes'],
          ['Database', 'Supabase (PostgreSQL)'],
          ['Push', 'OneSignal'],
          ['Hosting', 'Vercel'],
        ]}
      />

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Estructura de Archivos</h3>
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
      <SectionTitle>🗄️ Base de Datos</SectionTitle>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Tablas Principales</h3>
      <Table
        headers={['Tabla', 'Propósito']}
        rows={[
          ['users', 'Usuarios, streaks, auras, shields'],
          ['pulses', 'Registro de cada pulse'],
          ['follows', 'Relaciones de seguimiento'],
          ['friend_streaks', 'Streaks compartidos'],
          ['active_sessions', 'Usuarios activos (live counter)'],
          ['lucky_drops', 'Rewards pendientes'],
          ['secret_achievements', 'Achievements ocultos'],
          ['friend_activity', 'Feed de actividad'],
          ['referrals', 'Sistema de referidos'],
        ]}
      />

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Migraciones</h3>
      <CodeBlock title="supabase/migrations/">{`001_initial_schema.sql
006_atomic_functions.sql
009_security_performance.sql
010_viral_features.sql
011_social_features.sql`}</CodeBlock>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Funciones Críticas</h3>
      <Table
        headers={['Función', 'Uso']}
        rows={[
          ['submit_pulse_atomic()', 'Submit pulse + streak atómico'],
          ['follow_user()', 'Follow + crear friend streak'],
          ['update_friend_streaks()', 'Actualizar streaks compartidos'],
          ['roll_lucky_drop()', '5% chance de reward'],
          ['check_secret_achievements()', 'Verificar achievements'],
          ['get_live_pulse_count()', 'Contador usuarios activos'],
        ]}
      />
    </div>
  );
}

function ApiSection() {
  return (
    <div>
      <SectionTitle>🔌 APIs</SectionTitle>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Endpoints Principales</h3>

      <div className="space-y-4">
        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <code className="text-[#7ee787]">POST</code>
          <code className="text-[#c9d1d9] ml-2">/api/pulse</code>
          <p className="text-sm text-[#8b949e] mt-2">
            Submit mood. Retorna streak, lucky drop, achievements, contexto.
          </p>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <code className="text-[#7ee787]">GET/POST/DELETE</code>
          <code className="text-[#c9d1d9] ml-2">/api/friends</code>
          <p className="text-sm text-[#8b949e] mt-2">
            GET: listar followers/following. POST: follow. DELETE: unfollow.
          </p>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <code className="text-[#7ee787]">GET</code>
          <code className="text-[#c9d1d9] ml-2">/api/friends/feed</code>
          <p className="text-sm text-[#8b949e] mt-2">
            Feed de actividad de amigos (últimas 24h).
          </p>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <code className="text-[#7ee787]">GET/POST</code>
          <code className="text-[#c9d1d9] ml-2">/api/live</code>
          <p className="text-sm text-[#8b949e] mt-2">
            GET: contador live. POST: heartbeat de sesión.
          </p>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <code className="text-[#7ee787]">GET/POST</code>
          <code className="text-[#c9d1d9] ml-2">/api/drops</code>
          <p className="text-sm text-[#8b949e] mt-2">
            GET: drops sin reclamar. POST: claim drop.
          </p>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Rate Limiting</h3>
      <Table
        headers={['Endpoint', 'Límite']}
        rows={[
          ['pulse', '10 req/minuto'],
          ['recovery', '5 req/hora'],
          ['reactions', '30 req/minuto'],
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
        Requieren header <code className="text-[#7ee787]">Authorization: Bearer CRON_SECRET</code>
      </p>

      <Table
        headers={['Endpoint', 'Schedule', 'Descripción']}
        rows={[
          ['/api/cron/cleanup', '0 * * * *', 'Limpieza general'],
          ['/api/cron/nudges', '*/15 * * * *', 'Recordatorios streak'],
          ['/api/cron/friend-streaks', '0 0 * * *', 'Reset streaks rotos'],
          ['/api/cron/cleanup-social', '0 * * * *', 'Limpiar sesiones'],
        ]}
      />

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Configuración Vercel</h3>
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

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Tipos de Notificaciones</h3>
      <Table
        headers={['Tipo', 'Trigger', 'Contenido']}
        rows={[
          ['Window Open', 'Cron nudges', 'La ventana está abierta'],
          ['Streak Risk', 'Cron nudges', 'Tu streak está en riesgo'],
          ['Friend Pulse', 'POST /api/pulse', 'María compartió su vibe'],
          ['Friend Streak Risk', 'Cron friend-streaks', 'Tu streak con X está en riesgo'],
        ]}
      />

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Android Channels</h3>
      <ul className="list-disc list-inside text-[#8b949e] space-y-1">
        <li><code>default</code> - Ventanas y general</li>
        <li><code>streak</code> - Alertas de streak</li>
        <li><code>friend_activity</code> - Actividad de amigos</li>
      </ul>
    </div>
  );
}

function MonitorSection() {
  return (
    <div>
      <SectionTitle>📊 Monitoreo</SectionTitle>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Métricas Clave</h3>
      <Table
        headers={['Métrica', 'Query/Método']}
        rows={[
          ['DAU', 'SELECT FROM aggregates_global_day'],
          ['Pulses/Ventana', 'SELECT FROM aggregates_global_window'],
          ['Streaks Activos', 'COUNT users WHERE streak_days > 0'],
          ['Friend Streaks', 'COUNT friend_streaks WHERE streak_days > 0'],
          ['Referrals', 'SUM referral_count FROM users'],
        ]}
      />

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Health Checks</h3>
      <CodeBlock title="bash">{`# API health
curl https://your-app.vercel.app/api/pulse -I

# Database: Supabase Dashboard > Logs
# Push: OneSignal Dashboard`}</CodeBlock>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Alertas Recomendadas</h3>
      <ul className="list-disc list-inside text-[#8b949e] space-y-1">
        <li>Error rate &gt; 1% en /api/pulse</li>
        <li>Latencia &gt; 2s en /api/pulse</li>
        <li>Cron jobs fallidos</li>
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
          <h4 className="font-semibold text-[#f85149] mb-2">&quot;User not found&quot; en pulse</h4>
          <ol className="list-decimal list-inside text-[#8b949e] space-y-1 text-sm">
            <li>Verificar userId existe en users</li>
            <li>Verificar /api/users/bootstrap funciona</li>
          </ol>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <h4 className="font-semibold text-[#f85149] mb-2">Streak no incrementa</h4>
          <ol className="list-decimal list-inside text-[#8b949e] space-y-1 text-sm">
            <li>Verificar logs de submit_pulse_atomic</li>
            <li>Verificar no hay pulses duplicados</li>
            <li>Verificar timezone del usuario</li>
          </ol>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <h4 className="font-semibold text-[#f85149] mb-2">Friend streak no actualiza</h4>
          <ol className="list-decimal list-inside text-[#8b949e] space-y-1 text-sm">
            <li>Verificar mutual follow existe</li>
            <li>Verificar entrada en friend_streaks</li>
            <li>Verificar update_friend_streaks() se ejecuta</li>
          </ol>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <h4 className="font-semibold text-[#f85149] mb-2">Push no llegan</h4>
          <ol className="list-decimal list-inside text-[#8b949e] space-y-1 text-sm">
            <li>Verificar OneSignal credentials</li>
            <li>Verificar onesignal_player_id en users</li>
            <li>Verificar push_opt_in = true</li>
            <li>Check OneSignal dashboard</li>
          </ol>
        </div>

        <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
          <h4 className="font-semibold text-[#f85149] mb-2">Lucky drops no aparecen</h4>
          <ol className="list-decimal list-inside text-[#8b949e] space-y-1 text-sm">
            <li>Es 5% probabilidad - puede tomar varios pulses</li>
            <li>Verificar lucky_drops tabla</li>
            <li>Verificar LuckyDropNotification está montado</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function EnvSection() {
  return (
    <div>
      <SectionTitle>🔐 Variables de Entorno</SectionTitle>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Requeridas</h3>
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

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Opcionales</h3>
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
          'Migraciones de DB aplicadas',
          'Variables de entorno configuradas',
          'OneSignal app creada',
          'Cron jobs en vercel.json',
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
          'Verificar /api/pulse funciona',
          'Verificar push notifications llegan',
          'Verificar cron jobs ejecutan',
          'Verificar analytics tracking',
        ].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="w-4 h-4 border border-[#30363d] rounded"></span>
            {item}
          </li>
        ))}
      </ul>

      <h3 className="text-lg font-semibold text-[#c9d1d9] mt-6 mb-3">Comandos</h3>
      <CodeBlock title="bash">{`# Aplicar migraciones
supabase db push

# Deploy a Vercel
vercel --prod

# Verificar deploy
curl https://your-app.vercel.app/api/pulse -I`}</CodeBlock>

      <h3 className="text-lg font-semibold text-[#f85149] mt-6 mb-3">Rollback</h3>
      <ol className="list-decimal list-inside text-[#8b949e] space-y-1">
        <li>Revertir deployment en Vercel Dashboard</li>
        <li>Si hay cambios de DB, revertir migración manualmente</li>
        <li>Verificar datos de usuarios no se perdieron</li>
      </ol>
    </div>
  );
}
