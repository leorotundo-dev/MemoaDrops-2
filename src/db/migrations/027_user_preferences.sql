-- Preferências de Notificação do Usuário
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  study_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  news_updates BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_optin BOOLEAN NOT NULL DEFAULT FALSE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  quiet_hours_start TIME, -- ex: '22:00'
  quiet_hours_end TIME,   -- ex: '07:00'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION trig_user_prefs_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_user_prefs_updated ON user_preferences;
CREATE TRIGGER trg_user_prefs_updated BEFORE UPDATE ON user_preferences
FOR EACH ROW EXECUTE PROCEDURE trig_user_prefs_updated();
