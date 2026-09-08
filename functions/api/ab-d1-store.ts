/**
 * D1-backed A/B event store.
 * Writes are INSERTs (no KV puts). Lifetime reads use ab_event_stats;
 * day-range dashboard queries still aggregate ab_events.
 */

export type AbD1Namespace = 'donhin' | 'home' | 'ads' | 'lp';

export type AbD1Channel = 'all' | 'fb_ads' | 'google_ads';

export type AbD1Metric = 'impression' | 'click' | 'conversion';

export type AbD1Event = {
  experiment: string;
  variant: string;
  metric: AbD1Metric;
};

export type AbD1VariantStats = {
  impression: number;
  click: number;
  conversion: number;
};

export type AbD1StatsStore = Record<string, Record<string, AbD1VariantStats>>;

/** Events from this day onward live in D1; older daily buckets stay in KV. */
export const D1_EVENTS_SINCE = '2026-07-27';

type AggRow = {
  experiment: string;
  variant: string;
  metric: string;
  count: number;
};

export async function insertAbEvents(
  db: D1Database,
  namespace: AbD1Namespace,
  channel: AbD1Channel,
  events: AbD1Event[],
  day: string,
): Promise<void> {
  if (!events.length) return;

  await ensureAbEventStats(db);

  const stmts = events.flatMap((event) => [
    db
      .prepare(
        `INSERT INTO ab_events (namespace, channel, experiment, variant, metric, day)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(namespace, channel, event.experiment, event.variant, event.metric, day),
    // Keep lifetime counters in sync for allocate (no full ab_events SCAN).
    db
      .prepare(
        `INSERT INTO ab_event_stats (namespace, channel, experiment, variant, metric, count)
         VALUES (?, ?, ?, ?, ?, 1)
         ON CONFLICT(namespace, channel, experiment, variant, metric)
         DO UPDATE SET count = count + 1`,
      )
      .bind(namespace, channel, event.experiment, event.variant, event.metric),
  ]);

  await db.batch(stmts);
}

/** One-time (or repair) rebuild of lifetime counters from raw events. */
export async function backfillAbEventStats(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS ab_event_stats (
        namespace TEXT NOT NULL,
        channel TEXT NOT NULL,
        experiment TEXT NOT NULL,
        variant TEXT NOT NULL,
        metric TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (namespace, channel, experiment, variant, metric)
      )`,
    )
    .run();
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS ab_app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
    )
    .run();
  await db
    .prepare(
      `INSERT INTO ab_event_stats (namespace, channel, experiment, variant, metric, count)
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
       ON CONFLICT(namespace, channel, experiment, variant, metric) DO UPDATE SET count = excluded.count`,
    )
    .run();
  await db
    .prepare(
      `INSERT INTO ab_app_meta (key, value) VALUES ('ab_event_stats_backfilled', datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run();
}

async function ensureAbEventStats(db: D1Database): Promise<void> {
  try {
    const ready = await db
      .prepare(`SELECT value FROM ab_app_meta WHERE key = 'ab_event_stats_backfilled'`)
      .first<{ value: string }>();
    if (ready?.value) return;
  } catch {
    // Tables may not exist yet on first boot after deploy.
  }
  await backfillAbEventStats(db);
}

async function aggregateAbEventsFromStats(
  db: D1Database,
  namespace: AbD1Namespace,
  channel: AbD1Channel,
): Promise<AggRow[]> {
  const clauses = ['namespace = ?'];
  const params: (string | number)[] = [namespace];

  if (channel !== 'all') {
    clauses.push('channel = ?');
    params.push(channel);
  }

  const sql = `
    SELECT experiment, variant, metric, SUM(count) AS count
    FROM ab_event_stats
    WHERE ${clauses.join(' AND ')}
    GROUP BY experiment, variant, metric
  `;

  const { results } = await db.prepare(sql).bind(...params).all<AggRow>();
  return results || [];
}

export async function aggregateAbEvents(
  db: D1Database,
  namespace: AbD1Namespace,
  channel: AbD1Channel,
  fromDay?: string,
  toDay?: string,
): Promise<AggRow[]> {
  // Hot path (allocate / lifetime dashboard): tiny ab_event_stats table.
  if (!fromDay && !toDay) {
    try {
      await ensureAbEventStats(db);
      return await aggregateAbEventsFromStats(db, namespace, channel);
    } catch (error) {
      console.error('ab_event_stats read failed; falling back to ab_events scan', error);
    }
  }

  const clauses = ['namespace = ?'];
  const params: (string | number)[] = [namespace];

  if (channel !== 'all') {
    clauses.push('channel = ?');
    params.push(channel);
  }

  if (fromDay) {
    clauses.push('day >= ?');
    params.push(fromDay);
  }
  if (toDay) {
    clauses.push('day <= ?');
    params.push(toDay);
  }

  const sql = `
    SELECT experiment, variant, metric, COUNT(*) AS count
    FROM ab_events
    WHERE ${clauses.join(' AND ')}
    GROUP BY experiment, variant, metric
  `;

  const { results } = await db.prepare(sql).bind(...params).all<AggRow>();
  return results || [];
}

export function applyAggRowsToStore(
  base: AbD1StatsStore,
  rows: AggRow[],
): AbD1StatsStore {
  for (const row of rows) {
    if (!base[row.experiment]?.[row.variant]) continue;
    const metric = row.metric as AbD1Metric;
    if (metric !== 'impression' && metric !== 'click' && metric !== 'conversion') continue;
    base[row.experiment][row.variant][metric] += Number(row.count) || 0;
  }
  return base;
}
