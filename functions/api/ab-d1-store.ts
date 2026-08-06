/**
 * D1-backed A/B event store.
 * Writes are INSERTs (no KV puts). Reads aggregate + merge frozen KV baselines.
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

  const stmts = events.map((event) =>
    db
      .prepare(
        `INSERT INTO ab_events (namespace, channel, experiment, variant, metric, day)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(namespace, channel, event.experiment, event.variant, event.metric, day),
  );

  await db.batch(stmts);
}

export async function aggregateAbEvents(
  db: D1Database,
  namespace: AbD1Namespace,
  channel: AbD1Channel,
  fromDay?: string,
  toDay?: string,
): Promise<AggRow[]> {
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
