-- Lifetime A/B counters so /api/*-ab-allocate does not SCAN ab_events on every pageview.
CREATE TABLE IF NOT EXISTS ab_event_stats (
  namespace TEXT NOT NULL,
  channel TEXT NOT NULL,
  experiment TEXT NOT NULL,
  variant TEXT NOT NULL,
  metric TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (namespace, channel, experiment, variant, metric)
);

CREATE TABLE IF NOT EXISTS ab_app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO ab_event_stats (namespace, channel, experiment, variant, metric, count)
SELECT
  namespace,
  channel,
  experiment,
  variant,
  metric,
  COUNT(*)
FROM ab_events
WHERE experiment IS NOT NULL
  AND variant IS NOT NULL
  AND trim(experiment) != ''
  AND trim(variant) != ''
GROUP BY 1, 2, 3, 4, 5
ON CONFLICT(namespace, channel, experiment, variant, metric) DO UPDATE SET count = excluded.count;

INSERT INTO ab_app_meta (key, value) VALUES ('ab_event_stats_backfilled', datetime('now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value;
