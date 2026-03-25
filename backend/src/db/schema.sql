-- Users: stores registered accounts
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- AWS Accounts: one per user, credentials stored encrypted
CREATE TABLE aws_accounts (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
  access_key_enc TEXT NOT NULL,
  secret_key_enc TEXT NOT NULL,
  region         VARCHAR(50) DEFAULT 'us-east-1',
  created_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)           -- one AWS account per user
);

-- Resource Snapshots: historical cost tracking
CREATE TABLE resource_snapshots (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
  estimated_cost   NUMERIC(10, 2),
  snapshot_data    JSONB,   -- full resource JSON
  created_at       TIMESTAMP DEFAULT NOW()
);