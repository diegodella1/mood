-- Admin Panel Schema Migration
-- Events, Notifications, Alerts, and Audit Logging

-- Eventos
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    banner_url TEXT,
    event_type TEXT NOT NULL DEFAULT 'general', -- general, challenge, special
    status TEXT NOT NULL DEFAULT 'draft', -- draft, active, completed, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_end_at ON events(end_at);

-- Participación en eventos
CREATE TABLE IF NOT EXISTS event_participations (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    completion_data JSONB DEFAULT '{}',
    PRIMARY KEY (user_id, event_id)
);

CREATE INDEX idx_event_participations_event_id ON event_participations(event_id);

-- Notificaciones programadas
CREATE TABLE IF NOT EXISTS notification_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    audience_type TEXT NOT NULL DEFAULT 'all', -- all, country, city, users
    audience_payload JSONB DEFAULT '{}', -- e.g., {"country_codes": ["US", "MX"]} or {"user_ids": [...]}
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, cancelled, failed
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_schedules_status ON notification_schedules(status);
CREATE INDEX idx_notification_schedules_scheduled_for ON notification_schedules(scheduled_for);

-- Alertas del sistema (banners, announcements)
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    alert_type TEXT NOT NULL DEFAULT 'info', -- info, warning, error, success, promo
    severity TEXT NOT NULL DEFAULT 'low', -- low, medium, high, critical
    dismissible BOOLEAN DEFAULT TRUE,
    active_from TIMESTAMPTZ DEFAULT NOW(),
    active_until TIMESTAMPTZ,
    target_audience TEXT DEFAULT 'all', -- all, new_users, active_users
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_active_from ON alerts(active_from);
CREATE INDEX idx_alerts_active_until ON alerts(active_until);

-- Alertas vistas/descartadas por usuario
CREATE TABLE IF NOT EXISTS user_alerts (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    seen_at TIMESTAMPTZ DEFAULT NOW(),
    dismissed_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, alert_id)
);

-- Log de auditoría para acciones admin
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL, -- create, update, delete, send_notification, etc.
    resource_type TEXT NOT NULL, -- user, event, alert, notification
    resource_id TEXT, -- ID del recurso afectado
    admin_id TEXT, -- Identificador del admin (puede ser IP o token hash)
    changes JSONB DEFAULT '{}', -- Cambios realizados
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (aunque admin bypasea con service role)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy para que usuarios puedan ver eventos activos
CREATE POLICY "Events are viewable by everyone" ON events
    FOR SELECT USING (status = 'active');

-- Policy para participaciones
CREATE POLICY "Users can view own participations" ON event_participations
    FOR SELECT USING (true);

CREATE POLICY "Users can join events" ON event_participations
    FOR INSERT WITH CHECK (true);

-- Policy para alertas (usuarios pueden ver alertas activas)
CREATE POLICY "Active alerts are viewable" ON alerts
    FOR SELECT USING (
        active_from <= NOW() AND
        (active_until IS NULL OR active_until >= NOW())
    );

-- Policy para user_alerts
CREATE POLICY "Users can manage own alert status" ON user_alerts
    FOR ALL USING (true);
