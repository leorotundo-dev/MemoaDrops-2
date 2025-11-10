-- Garante colunas necessárias em user_devices
ALTER TABLE user_devices
  ADD COLUMN IF NOT EXISTS platform TEXT CHECK (platform IN ('ios','android','web')) DEFAULT 'android',
  ADD COLUMN IF NOT EXISTS device_model TEXT,
  ADD COLUMN IF NOT EXISTS app_version TEXT,
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();

-- Evita duplicados por usuário/token
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_devices_user_token_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_user_devices_user_token_unique ON user_devices(user_id, token);
  END IF;
END $$;

-- Atualiza last_seen automaticamente
CREATE OR REPLACE FUNCTION trig_user_devices_seen()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.last_seen = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_user_devices_seen ON user_devices;
CREATE TRIGGER trg_user_devices_seen BEFORE UPDATE ON user_devices
FOR EACH ROW EXECUTE PROCEDURE trig_user_devices_seen();
