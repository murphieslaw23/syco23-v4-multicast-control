export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS streams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  artist TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL DEFAULT 'offline'
);

CREATE TABLE IF NOT EXISTS destinations (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  label TEXT NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'rtmps',
  endpoint_url TEXT NOT NULL DEFAULT '',
  stream_key_ref TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'idle',
  health TEXT,
  last_handshake_at TEXT,
  last_error TEXT,
  video_profile TEXT NOT NULL DEFAULT '1080p',
  audio_profile TEXT NOT NULL DEFAULT '128k',
  monitor_mode TEXT NOT NULL DEFAULT 'rtmp-output',
  hls_playback_url TEXT,
  provider_ack_url TEXT,
  provider_metadata_url TEXT,
  provider_api_secret_ref TEXT,
  requires_manual_setup INTEGER NOT NULL DEFAULT 0,
  transmission_kit_id TEXT,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS output_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,
  video_bitrate INTEGER NOT NULL DEFAULT 4500,
  audio_bitrate INTEGER NOT NULL DEFAULT 128,
  fps INTEGER NOT NULL DEFAULT 30,
  codec TEXT NOT NULL DEFAULT 'h264'
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  preview_url TEXT NOT NULL DEFAULT '',
  is_custom INTEGER NOT NULL DEFAULT 0,
  custom_background_ref TEXT,
  scene_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS transmission_kits (
  id TEXT PRIMARY KEY,
  destination_id TEXT NOT NULL,
  title_block TEXT NOT NULL DEFAULT '',
  description_block TEXT NOT NULL DEFAULT '',
  metadata TEXT NOT NULL DEFAULT '{}',
  labels TEXT NOT NULL DEFAULT '[]',
  launch_notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  action TEXT NOT NULL,
  run_at TEXT NOT NULL,
  recurrence_minutes INTEGER,
  payload TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  next_run_at TEXT NOT NULL,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS audit_entries (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  outcome TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT NOT NULL,
  resolution TEXT
);

CREATE TABLE IF NOT EXISTS log_entries (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  level TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metadata_snapshots (
  id TEXT PRIMARY KEY,
  captured_at TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  artist TEXT NOT NULL DEFAULT '',
  show_name TEXT,
  artwork_url TEXT,
  listeners INTEGER,
  bitrate INTEGER,
  codec TEXT
);


CREATE TABLE IF NOT EXISTS destination_worker_events (
  id TEXT PRIMARY KEY,
  destination_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  state TEXT,
  message TEXT,
  detail TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_destination_worker_events_destination_time ON destination_worker_events(destination_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS provider_monitor_events (
  id TEXT PRIMARY KEY,
  destination_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  state TEXT NOT NULL,
  message TEXT,
  detail TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_provider_monitor_events_destination_time ON provider_monitor_events(destination_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS watchdog_events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  source TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_assets (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL DEFAULT '',
  sha256 TEXT NOT NULL DEFAULT ''
);
`;

export interface SchemaValidationResult {
  valid: boolean;
  tables: string[];
  missing: string[];
}

const REQUIRED_TABLES = [
  "streams",
  "destinations",
  "output_profiles",
  "templates",
  "transmission_kits",
  "schedules",
  "audit_entries",
  "incidents",
  "log_entries",
  "metadata_snapshots",
  "watchdog_events",
  "destination_worker_events",
  "provider_monitor_events",
  "user_assets",
];

export function validateSchema(sql: string): SchemaValidationResult {
  const tables = REQUIRED_TABLES.filter((t) =>
    sql.includes(`CREATE TABLE IF NOT EXISTS ${t}`),
  );
  const missing = REQUIRED_TABLES.filter((t) => !tables.includes(t));
  return { valid: missing.length === 0, tables, missing };
}
