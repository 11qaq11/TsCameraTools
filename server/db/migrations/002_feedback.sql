CREATE TABLE IF NOT EXISTS feedbacks (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(128) DEFAULT '',
  category VARCHAR(64) DEFAULT 'bug',
  title VARCHAR(256) NOT NULL,
  content TEXT NOT NULL,
  contact VARCHAR(256) DEFAULT '',
  device_model VARCHAR(128) DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);
