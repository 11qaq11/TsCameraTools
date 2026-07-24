-- Replace is_admin with role
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(16) DEFAULT 'user';

-- Convert existing is_admin users to admin role
UPDATE users SET role = 'admin' WHERE is_admin = true AND (role IS NULL OR role = 'user');

-- Set owner (张稚阳) 
UPDATE users SET role = 'owner' WHERE feishu_id = 'ou_5570eefd7f6c4ae93be339977f36bcd6';

-- Drop old is_admin column
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  error_type VARCHAR(64) DEFAULT 'unknown',
  message TEXT NOT NULL,
  stack_trace TEXT DEFAULT '',
  device_info JSONB DEFAULT '{}',
  app_version VARCHAR(32) DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
