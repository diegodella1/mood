Thought for 1m 41s

Abajo tenés el PRD adaptado al stack (PWA + Next.js App Router + Supabase + Vercel + OneSignal). Está en Markdown, listo para copiar/pegar en Claude.

PRD — The Button (Global Pulse) — PWA + OneSignal Push
0) Summary

The Button es una PWA instalable donde el usuario marca su “estado” con 1 tap (6 moods) 3 veces por día (ventanas locales). La app muestra el pulso global (mundo + top ciudades) y entrega recompensa constante con push notifications (OneSignal) por: apertura de ventanas, reacciones, cambios de tendencia, streak/badges, y nudges automáticos.

No cámara. No audio. No texto.
Perfiles anónimos con identidad ligera (handle + aura + streak + badges).

1) Stack (obligatorio)

Frontend: Next.js (App Router), PWA instalable (manifest + icons + SW)

Push: OneSignal Web Push (SDK + Service Worker)

Backend: Next.js Route Handlers (API) + Supabase (DB + RLS)

Scheduler: Vercel Cron Jobs llamando endpoints HTTP en producción

Hosting: Vercel

2) Non-negotiables de UX

Abrís la app y el primer frame es el botón/moods.

Cero onboarding antes del primer tap.

Push permission se pide después del primer tap (“para ver el pulso + recibir reacciones”).

Todo es tap-based (moods + reacciones), sin input de texto.

3) Core loop
3.1. Daily loop

Usuario abre → ve 6 moods (🔥 😵‍💫 😌 😈 💔 🧠) y el countdown a la próxima ventana.

Tap mood → se registra pulse para la ventana activa.

Se muestra “Results” (global + ciudad + tendencia).

CTA opcional: “React to 5 pulses” (1 tap cada uno).

Durante el día llegan push (OneSignal) por milestones y eventos.

3.2. Social loop (sin chat)

Reacciones a pulses (❤️ 😂 🔥 🫂 💀).

Match “light” (solo %): “You matched with 12% of your city”.

4) Ventanas: 3 por día (por timezone del usuario)

Ventanas locales:

Morning: 08:00–11:00

Afternoon: 13:00–16:00

Night: 20:00–23:00

Reglas:

1 pulse por usuario por ventana (unique(user_id, window_id)).

Fuera de ventana: solo lectura + countdown.

5) PWA (instalable)
5.1. Requisitos PWA

manifest.webmanifest con:

name/short_name

start_url

display: standalone

icons (192/512, maskable)

theme_color / background_color

UI con “Install prompt” no intrusivo (solo cuando el browser lo soporta).

Nota: OneSignal usa su propio Service Worker para push; en MVP no implementamos offline caching para evitar conflictos. Si más adelante querés offline, se planifica una fusión de service workers (v2).

6) OneSignal Web Push (implementación)
6.1. SDK en Next.js

Usar react-onesignal y inicializar en un componente client-only (Root).

6.2. Service Worker (obligatorio)

OneSignal requiere OneSignalSDKWorker.js públicamente accesible y servido como JavaScript; el SDK por defecto lo busca en la raíz.

Archivo (MVP, root):

// /public/OneSignalSDKWorker.js
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");


Esto está alineado con la guía oficial de Web SDK setup.

6.3. Tags para segmentación (clave del producto)

Usar OneSignal Tags para targeting por país/ciudad/género/timezone/mood.

Tags propuestos (User-level):

tz = IANA timezone (ej: America/Argentina/Buenos_Aires)

country = ISO2 (ej: AR)

city_id = string/uuid (id interno)

gender = male|female|nonbinary|na

last_mood = hype|overwhelmed|calm|chaos|low|focused

streak_days = string (evitar numeric comparisons en tags en MVP; si se usa, solo “=”)

Para envíos masivos, OneSignal recomienda filtros por tags con “=” para mejor performance.

6.4. Identidad OneSignal: anónimo pero targeteable

Usuarios empiezan anónimos en OneSignal hasta asignar External ID (concepto de “Users”).

MVP recomendado:

Generar anon_user_id (UUID) en primera carga y persistir en localStorage.

Guardar anon_user_id en Supabase (tabla users).

Usar ese mismo id como External ID en OneSignal cuando el usuario habilita push (si tu integración usa el método equivalente del SDK actual).

(Claude debe elegir el método exacto según versión del SDK web que uses; la doc React/Next de OneSignal indica buenas prácticas para identificar usuarios).

7) Backend: Nudges + Notificaciones (solo push)
7.1. Objetivo del backend de notifs

Generar:

mass pushes automáticos (ventanas, drops, city flips, tendencias globales)

single-user pushes (reacciones, badges, streak risk)

Evitar spam con reglas estrictas (caps + grouping).

7.2. Envío de push: OneSignal Create Message API

Backend envía notifs usando Create Message API con:

included_segments (si aplica)

filters (preferido) por tags/country/etc.

8) Scheduler (Vercel Cron)

Usar Vercel Cron Jobs que hacen HTTP GET a tus endpoints /api/cron/....

8.1. Cron strategy (simple, robusta)

Ejecutar cada 5 minutos:

Determinar qué timezones están entrando en ventana (morning/afternoon/night).

Disparar “Window Open” push solo a esos timezones (tag tz = ...).

Ejecutar cada 10 minutos:

Recalcular “city flips” y “global trend” de la ventana activa y enviar pushes selectivos.

Ejecutar cada 15 minutos:

Procesar cola de “notification jobs” pendientes (single-user + mass).

8.2. vercel.json (ejemplo)
{
  "crons": [
    { "path": "/api/cron/tick-5m", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/tick-10m", "schedule": "*/10 * * * *" },
    { "path": "/api/cron/tick-15m", "schedule": "*/15 * * * *" }
  ]
}


Vercel cron funciona llamando endpoints HTTP en producción.

8.3. Seguridad cron

Todos los endpoints cron requieren header Authorization: Bearer CRON_SECRET.

9) Data model (Supabase) — tablas mínimas para este stack
9.1. users

id uuid (anon_user_id)

created_at

timezone text

country_code text

city_id uuid nullable

gender text nullable

push_opt_in bool default false

onesignal_external_id text nullable (si aplica)

last_active_at timestamp

9.2. pulse_windows

id text (ej: 2026-01-26|morning|America/Argentina/Buenos_Aires)

date date

window_type text (morning|afternoon|night)

tz text

starts_at_utc timestamp

ends_at_utc timestamp

9.3. pulses

id uuid

user_id uuid FK users

window_id text FK pulse_windows

mood text enum

country_code text

city_id uuid nullable

gender text nullable

created_at timestamp
Constraint: unique(user_id,window_id)

9.4. reactions

id uuid

pulse_id uuid FK pulses

from_user_id uuid FK users

emoji text enum

created_at

9.5. Aggregates (para mapa/ciudades)

aggregates_country_window (window_id, country_code, mood_counts jsonb, total_count int)

aggregates_city_window (window_id, city_id, mood_counts jsonb, total_count int)

9.6. Notifications backend (cola)
notification_templates

id text (slug)

type text (mass|single)

title jsonb (i18n)

body jsonb (i18n)

deeplink text

cooldown_minutes int

enabled bool

notification_jobs

id uuid

template_id text FK

audience_type text (single|tz|city|country|global|tag_filters)

audience_payload jsonb (ej: {tz:"America/..."} o {filters:[...]})

scheduled_for timestamp

status text (pending|sent|failed|canceled)

dedupe_key text (para no duplicar)

created_at

notification_deliveries

id uuid

job_id uuid

user_id uuid nullable (si single)

onesignal_message_id text nullable

status text (sent|failed)

created_at

10) API Routes (Next.js Route Handlers)
10.1. User + OneSignal

POST /api/users/bootstrap

crea/retorna anon user

detecta timezone (client) + country (server por IP) + city optional

POST /api/push/optin

marca push_opt_in = true

setea tags en OneSignal (tz/country/city/gender/last_mood)

POST /api/push/tags

actualiza tags (cada pulse y cuando cambian settings)

10.2. Pulses + reactions

POST /api/pulse

valida ventana activa + unique

inserta pulse

actualiza agregados (country/city)

encola notifs:

“thanks + react CTA” (opcional local)

“badge unlocked” (si aplica)

GET /api/pulse/aggregate

global + top cities + my city para window_id

POST /api/reaction

inserta reaction

encola push single-user al owner del pulse (“someone reacted”)

actualiza milestones para notifs agrupadas

10.3. Cron endpoints

GET /api/cron/tick-5m

window-open detection por timezone

crea notification_jobs mass por tz

GET /api/cron/tick-10m

detecta “city flips” y tendencias

encola notifs mass (solo si supera thresholds)

GET /api/cron/tick-15m

procesa notification_jobs pending

llama OneSignal Create Message API con filters

10.4. Admin (MVP simple)

POST /api/admin/notify

enviar push masivo manual (por city/country/global/tag filters)

requiere ADMIN_SECRET

11) Nudge engine (qué pushes existen)
11.1. Mass pushes automáticos

Window Open (3x/day por tz)

“Morning Pulse is live 🔥”

Target: tag tz = ... AND push_opt_in true

City Flip

“Buenos Aires just flipped to 😈”

Target: tag city_id = ...

Global Shift

“Global mood shift: 😵‍💫 +9 this window”

Target: global o top countries

11.2. Single-user pushes

Reaction Received

milestones: 1 / 3 / 10 / 25 reacciones

Badge unlocked

Streak risk

si faltan < X horas para cerrar ventana y el user no pulsó

11.3. Anti-spam rules

Cap default: max 5 pushes/día por user.

Agrupar milestones (no notificar cada reacción).

Quiet hours configurable.

12) Privacidad (producto)

No cámara/audio/texto → menor riesgo.

Ubicación: por defecto country por IP y “city” opt-in (lista), sin guardar GPS preciso.

Estadísticas por género solo si N >= threshold (ej 200 pulses por city/window).

13) Entregables para Claude (lo que tiene que construir)

Next.js PWA scaffolding (manifest + icons + install UX)

OneSignal Web Push integrado con react-onesignal

Service worker OneSignalSDKWorker.js en /public

Supabase SQL: tablas + constraints + índices + RLS básico

Route handlers: /api/pulse, /api/reaction, /api/cron/*, /api/admin/notify

OneSignal sender module (Create Message API + filters/tags)

Nudge engine + dedupe (notification_jobs + dedupe_key)

Share cards (server-generated OG-like images) (MVP: 3 templates)

Analytics events (pulse_submitted, reaction_sent, push_opt_in, share_clicked, etc.)

Vercel cron config vercel.json

14) Config / Secrets

Env vars:

NEXT_PUBLIC_ONESIGNAL_APP_ID

ONESIGNAL_REST_API_KEY (server only)

CRON_SECRET

ADMIN_SECRET

SUPABASE_URL

SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY (server only)

15) MVP scope (congelado)
Must have

Pulse 3 windows

Global + top cities

Reactions

OneSignal opt-in + tags

Cron nudges (window open + reaction received)

Badges básicos + streak

Share cards (3)

Nice later

City vs City events

Season leaderboards

Advanced auras

Manual influencer takeovers panel