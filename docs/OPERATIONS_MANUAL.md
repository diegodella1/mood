# Global Pulse - Manual de Operaciones

## Índice
1. [Arquitectura General](#arquitectura-general)
2. [Base de Datos](#base-de-datos)
3. [APIs](#apis)
4. [Cron Jobs](#cron-jobs)
5. [Notificaciones Push](#notificaciones-push)
6. [Monitoreo](#monitoreo)
7. [Troubleshooting](#troubleshooting)

---

## Arquitectura General

### Stack Tecnológico
- **Frontend:** Next.js 14 (App Router), React 18, Framer Motion
- **Backend:** Next.js API Routes, Supabase (PostgreSQL)
- **Push Notifications:** OneSignal
- **Hosting:** Vercel (recomendado)
- **Base de Datos:** Supabase (PostgreSQL con RLS)

### Estructura de Archivos
```
src/
├── app/
│   ├── api/              # API endpoints
│   │   ├── pulse/        # Submit mood
│   │   ├── friends/      # Social features
│   │   ├── live/         # Real-time counter
│   │   ├── drops/        # Lucky drops
│   │   ├── achievements/ # Secret achievements
│   │   ├── cron/         # Scheduled jobs
│   │   └── ...
│   ├── leaderboard/      # Leaderboard page
│   ├── profile/          # User profile
│   └── page.tsx          # Home
├── components/           # React components
├── hooks/               # Custom hooks
├── lib/                 # Utilities & configs
└── providers/           # Context providers
```

---

## Base de Datos

### Tablas Principales

| Tabla | Propósito |
|-------|-----------|
| `users` | Usuarios anónimos, streaks, auras, shields |
| `pulses` | Registro de cada pulse (mood submission) |
| `follows` | Relaciones de seguimiento entre usuarios |
| `friend_streaks` | Streaks compartidos (Snapchat-style) |
| `active_sessions` | Usuarios activos para contador live |
| `lucky_drops` | Rewards aleatorios pendientes |
| `user_special_emojis` | Emojis desbloqueados por usuario |
| `secret_achievements` | Definición de achievements ocultos |
| `user_secret_achievements` | Achievements ganados por usuario |
| `friend_activity` | Feed de actividad de amigos |
| `referrals` | Referidos y rewards |
| `aggregates_*` | Tablas de agregación para analytics |

### Migraciones
Las migraciones están en `supabase/migrations/` ordenadas numéricamente:
- `001` - Schema inicial
- `006` - Funciones atómicas
- `009` - Seguridad y performance
- `010` - Features virales (referrals, leaderboards)
- `011` - Features sociales (friends, streaks, drops)

### Funciones Críticas (PostgreSQL)

| Función | Uso |
|---------|-----|
| `submit_pulse_atomic()` | Submit de pulse con manejo de streak atómico |
| `follow_user()` | Seguir usuario + crear friend streak si mutual |
| `update_friend_streaks()` | Actualizar streaks compartidos al pulsear |
| `roll_lucky_drop()` | 5% chance de reward al pulsear |
| `check_secret_achievements()` | Verificar si se ganó achievement secreto |
| `get_live_pulse_count()` | Contador de usuarios activos |

### Row Level Security (RLS)
Todas las tablas tienen RLS habilitado. El `service_role` tiene acceso completo. Los usuarios anónimos solo pueden ver sus propios datos.

---

## APIs

### Endpoints Principales

#### POST /api/pulse
Submit de mood. Retorna:
- Streak actualizado
- Lucky drop (si cayó)
- Achievements nuevos (si se ganaron)
- Contexto (city match, global top mood)

#### GET/POST /api/friends
- `GET ?userId=X&type=followers|following|mutual` - Listar relaciones
- `POST {followerId, followingId}` - Seguir
- `DELETE {followerId, followingId}` - Dejar de seguir

#### GET /api/friends/feed?userId=X
Feed de actividad de amigos (últimas 24h)

#### GET /api/friends/streaks?userId=X
Streaks compartidos con indicador de riesgo

#### GET/POST /api/live
- `GET` - Contador live de usuarios activos
- `POST {userId}` - Heartbeat de sesión

#### GET/POST /api/drops
- `GET ?userId=X` - Drops sin reclamar
- `POST {userId, dropId}` - Reclamar drop

#### GET /api/achievements?userId=X&hints=true
Achievements secretos ganados (con hints opcionales)

### Rate Limiting
Implementado via `check_rate_limit()` en PostgreSQL:
- Pulse: 10 requests/minuto
- Recovery: 5 requests/hora
- Reactions: 30 requests/minuto

---

## Cron Jobs

### Configuración
Los cron jobs requieren autenticación via header `Authorization: Bearer {CRON_SECRET}`.

### Jobs Disponibles

| Endpoint | Schedule | Descripción |
|----------|----------|-------------|
| `/api/cron/cleanup` | `0 * * * *` | Limpieza general (pulses antiguos) |
| `/api/cron/nudges` | `*/15 * * * *` | Enviar recordatorios de streak |
| `/api/cron/friend-streaks` | `0 0 * * *` | Reset streaks rotos, notificar at-risk |
| `/api/cron/cleanup-social` | `0 * * * *` | Limpiar sesiones stale, actividad vieja |
| `/api/cron/battles` | Según config | Procesar batallas de ciudades |

### Configuración en Vercel
```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/cleanup", "schedule": "0 * * * *" },
    { "path": "/api/cron/nudges", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/friend-streaks", "schedule": "0 0 * * *" },
    { "path": "/api/cron/cleanup-social", "schedule": "0 * * * *" }
  ]
}
```

---

## Notificaciones Push

### OneSignal Setup
Variables de entorno requeridas:
```env
ONESIGNAL_APP_ID=your-app-id
ONESIGNAL_REST_API_KEY=your-rest-api-key
```

### Tipos de Notificaciones

| Tipo | Trigger | Contenido |
|------|---------|-----------|
| Window Open | Cron nudges | "Morning window is open! Share your vibe" |
| Streak at Risk | Cron nudges | "Your X-day streak is at risk!" |
| Friend Pulse | POST /api/pulse | "Maria just shared their vibe 😊" |
| Friend Streak Risk | Cron friend-streaks | "Your streak with Maria is at risk!" |
| Lucky Drop | POST /api/pulse | (Mostrado in-app, no push) |

### Android Channels
- `default` - Ventanas y general
- `streak` - Alertas de streak
- `friend_activity` - Actividad de amigos

---

## Monitoreo

### Métricas Clave
1. **DAU (Daily Active Users):** Query `aggregates_global_day`
2. **Pulses por Ventana:** Query `aggregates_global_window`
3. **Streaks Activos:** `SELECT COUNT(*) FROM users WHERE streak_days > 0`
4. **Friend Streaks:** `SELECT COUNT(*) FROM friend_streaks WHERE streak_days > 0`
5. **Referrals:** `SELECT SUM(referral_count) FROM users`

### Health Checks
```bash
# API health
curl https://your-app.vercel.app/api/pulse -I

# Database health (via Supabase dashboard)
# Check connection pool, query performance

# Push health
# Monitor OneSignal dashboard for delivery rates
```

### Alertas Recomendadas
- Error rate > 1% en /api/pulse
- Latencia > 2s en /api/pulse
- Cron jobs fallidos
- Push delivery rate < 90%

---

## Troubleshooting

### "User not found" en pulse
1. Verificar que el userId existe en `users`
2. Verificar que no hay problema con el bootstrap: `/api/users/bootstrap`

### Streak no incrementa
1. Verificar logs de `submit_pulse_atomic`
2. Verificar que no hay pulses duplicados para el mismo window
3. Verificar timezone del usuario vs window_id

### Friend streak no actualiza
1. Verificar que ambos usuarios se siguen mutuamente (mutual follow)
2. Verificar que `friend_streaks` tiene entrada para la pareja
3. Verificar `update_friend_streaks()` se ejecuta

### Push no llegan
1. Verificar OneSignal credentials
2. Verificar `onesignal_player_id` en tabla users
3. Verificar `push_opt_in = true`
4. Check OneSignal dashboard para errores

### Lucky drops no aparecen
1. Es 5% de probabilidad - puede tomar varios pulses
2. Verificar `lucky_drops` tabla para drops no reclamados
3. Verificar que el componente `LuckyDropNotification` está montado

### Cron jobs no corren
1. Verificar `CRON_SECRET` env var
2. Verificar configuración en vercel.json
3. Verificar logs en Vercel dashboard

---

## Variables de Entorno

### Requeridas
```env
# Supabase
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
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Opcionales
```env
# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXX

# Rate limiting (defaults shown)
RATE_LIMIT_PULSE=10
RATE_LIMIT_WINDOW_SECONDS=60
```

---

## Deployment Checklist

### Pre-Deploy
- [ ] Migraciones de DB aplicadas
- [ ] Variables de entorno configuradas
- [ ] OneSignal app creada y configurada
- [ ] Cron jobs configurados en vercel.json

### Post-Deploy
- [ ] Verificar /api/pulse funciona
- [ ] Verificar push notifications llegan
- [ ] Verificar cron jobs ejecutan
- [ ] Verificar analytics tracking

### Rollback
1. Revertir deployment en Vercel
2. Si hay cambios de DB, revertir migración manualmente
3. Verificar datos de usuarios no se perdieron

---

## Contacto

Para issues de producción:
- GitHub Issues: [repo-url]/issues
- Logs: Vercel Dashboard > Functions > Logs
- DB: Supabase Dashboard > Logs
