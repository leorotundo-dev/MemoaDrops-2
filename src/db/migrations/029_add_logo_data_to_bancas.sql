-- Migration: Add logo_data column to bancas table
-- Description: Store logo images as binary data in the database

ALTER TABLE bancas ADD COLUMN IF NOT EXISTS logo_data BYTEA;
ALTER TABLE bancas ADD COLUMN IF NOT EXISTS logo_mime_type VARCHAR(50);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_bancas_logo_data ON bancas(id) WHERE logo_data IS NOT NULL;

-- Add comment
COMMENT ON COLUMN bancas.logo_data IS 'Binary data of the logo image';
COMMENT ON COLUMN bancas.logo_mime_type IS 'MIME type of the logo image (e.g., image/png, image/jpeg)';
