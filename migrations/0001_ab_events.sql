-- A/B event log (replaces KV counter puts)
CREATE TABLE IF NOT EXISTS ab_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  namespace TEXT NOT NULL,
  channel TEXT NOT NULL,
  experiment TEXT NOT NULL,
  variant TEXT NOT NULL,
  metric TEXT NOT NULL,
  day TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ab_events_agg
  ON ab_events (namespace, channel, day, experiment, variant, metric);

CREATE INDEX IF NOT EXISTS idx_ab_events_ns_day
  ON ab_events (namespace, day);
