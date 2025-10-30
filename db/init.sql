CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS channels (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'youtube',
  rtmp_url TEXT NOT NULL DEFAULT 'rtmp://a.rtmp.youtube.com/live2',
  stream_key_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS active_streams (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('per_channel','tee')),
  input_file TEXT NOT NULL,
  channel_ids BIGINT[] NOT NULL,
  pid INT,
  started_at TIMESTAMPTZ DEFAULT now(),
  stopped_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input_file TEXT NOT NULL,
  channel_ids BIGINT[] NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('per_channel','tee')),
  start_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, done, failed, canceled
  created_at TIMESTAMPTZ DEFAULT now()
);
