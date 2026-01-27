PRD Addendum v1.1 — The Button “Ritual + Drops + City Battles” (Backend-configurable)
Principio rector

Nada “hardcodeado” en el frontend salvo los 6 moods y la UI base.
Todo lo demás (ventanas, eventos, copy, reglas, thresholds, targets y scheduling) se define y cambia desde backend sin redeploy.

1) Configuración central (Backend)
1.1 app_config (single row)

Tabla de configuración global (key/value JSON), editable por admin.

Campos sugeridos:

windows.enabled (bool)

windows.schedule (por timezone bucket): morning/afternoon/night start/end

privacy.min_city_pulses (int)

privacy.min_segment_pulses (int)

push.daily_cap_default (int)

push.quiet_hours (obj: start/end local)

flip.enabled (bool)

flip.min_city_pulses (int)

flip.min_delta_points (int)

shift.enabled (bool)

shift.min_global_pulses (int)

shift.min_delta_points (int)

battles.enabled (bool)

battles.scoring_mode (enum: per_capita_bucket | total)

a2hs.enabled (bool)

a2hs.cooldown_hours (int)

Criterio: el backend lee app_config para cada cron/decision.

2) LIVE Windows (Ritual Core) — configurable
Qué se configura

Horarios de ventanas (por tz bucket o global default)

Tolerancia de cron (ej. 5 min)

Copy de notificación “window open”

Deep link de la notificación

Backend requirements

Tabla window_schedules o config JSON en app_config

Endpoint admin para actualizar schedule sin deploy

Cron usa ese schedule para disparar pushes

3) City Flip Alerts — configurable
Qué se configura

Enabled on/off

Thresholds: min_city_pulses, min_delta_points

Copy de push y share card template

Segment target:

solo usuarios de la ciudad (city_id)

o país completo

Rate limits (1 por ciudad/ventana, o configurable)

Backend requirements

Tabla city_flips (event log)

Tabla/JSON notification_templates editable (flip)

Cron /api/cron/flips lee config + genera jobs

4) Global Shift Alerts — configurable
Qué se configura

Enabled

Thresholds: min_global_pulses, min_delta_points

Frecuencia: 1 por ventana, o 1 por día (config)

Audience target:

global

por tz bucket

por país top N

Copy + share templates

Backend requirements

Tabla global_shifts

Templates editables para shift

Cron /api/cron/shifts configurable

5) Weekly City Battles — configurable
Qué se configura (100% desde backend)

Qué ciudades participan

Fechas (start/end)

Scoring mode (per capita bucket vs total)

Copys (start/mid/end)

Qué pushes mandar y cuándo (schedule)

Assets de cards (colores, textos, labels)

Umbrales de “close match” para mandar mid push

Backend requirements

Tabla city_battles (definición editable)

Tabla city_battle_scores (computed)

Admin endpoints:

POST/PUT city battle

start/stop/pause

preview cards

Cron /api/cron/battles:

calcula score

crea notification_jobs según schedule configurado

6) iOS Add-to-Home-Screen flow — configurable
Qué se configura

Enabled

Cooldown (“no mostrar de nuevo por X horas”)

Triggers (después del primer pulse, después de 2 pulses, etc.)

Copy y estilo

Backend requirements

app_config.a2hs.*

Tabla user_prompts para trackear cuándo se mostró

7) Push system (OneSignal) — configurable
Qué se configura

Cap diario global (default) + overrides por cohort

Quiet hours por defecto (y override por user)

Prioridades de notificación (streak risk > reaction > flip > battle > shift)

Templates (title/body/deeplink) editables en DB

Segmentación por tags (country/city/tz/etc.) definida por config

Backend requirements

notification_templates (editable)

notification_jobs (queue)

notification_deliveries (audit)

notification_rules (opcional): reglas declarativas para generar nudges

8) Nudges engine — configurable
Qué se configura

Reglas activas (ej. “no pulsó en ventana actual”)

Timing (cada X minutos)

Copy variants

Cohorts target (new users, streak users, etc.)

Dedupe windows (no más de 1 nudge por ventana)

Backend requirements

Tabla nudge_rules (enabled, query params, templates, cooldown)

Cron /api/cron/nudges ejecuta reglas

9) Frontend contract (para mantenerlo simple)

El frontend debe ser “tonto”:

Consume GET /api/config (cacheado) para:

si flips/battles/shifts están activos

thresholds (para UI)

textos/copy (si querés i18n)

Renderiza módulos si enabled=true

No contiene lógica de negocio hardcodeada fuera de:

UI base

6 moods

10) Definition of Done (v1.1 configurable)

Cambiar horarios de ventanas desde backend sin redeploy

Activar/desactivar flips/shifts/battles desde backend

Editar copy y templates desde backend

Crear una City Battle semanal desde backend

Caps/quiet hours/push rules controladas desde backend

Cron jobs generan notifs en base a config y respetan dedupe/caps