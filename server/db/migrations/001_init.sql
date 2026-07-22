-- Users table: Feishu user information
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  feishu_id     VARCHAR(64) NOT NULL UNIQUE,
  name          VARCHAR(128) NOT NULL,
  email         VARCHAR(256) DEFAULT '',
  avatar        VARCHAR(512) DEFAULT '',
  tenant_key    VARCHAR(64) DEFAULT '',
  created_at    TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_feishu_id ON users(feishu_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_key ON users(tenant_key);

-- Sessions table: Login sessions
CREATE TABLE IF NOT EXISTS sessions (
  id            VARCHAR(64) PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMP DEFAULT NOW(),
  expires_at    TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Device history table: ADB device connection records
CREATE TABLE IF NOT EXISTS device_history (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_serial VARCHAR(128) NOT NULL,
  device_model  VARCHAR(128) DEFAULT '',
  connected_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_device_history_user_id ON device_history(user_id);
