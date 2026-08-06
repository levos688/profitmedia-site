import {
  aggregateAbEvents,
  applyAggRowsToStore,
  insertAbEvents,
} from './ab-d1-store';

export type LpAbMetric = 'impression' | 'click' | 'conversion';
export type LpAbChannel = 'all' | 'google_ads';
export type LpAbVariantStats = Record<LpAbMetric, number>;
export type LpAbStatsStore = Record<string, Record<string, LpAbVariantStats>>;

export const LP_AB_EXPERIMENTS = {
  page_order: ['proof_first', 'mechanism_first'],
  landing_keyword: ['digital-advertising-agency', 'digital-advertising-office'],
} as const;

export type LpAbTrackEvent = {
  experiment: string;
  variant: string;
  metric: LpAbMetric;
};

export function emptyLpStats(): LpAbStatsStore {
  const store: LpAbStatsStore = {};
  for (const [experiment, variants] of Object.entries(LP_AB_EXPERIMENTS)) {
    store[experiment] = {};
    for (const variant of variants) {
      store[experiment][variant] = { impression: 0, click: 0, conversion: 0 };
    }
  }
  return store;
}

export async function readLpAbStats(
  db: D1Database,
  channel: LpAbChannel = 'all',
  from?: string,
  to?: string,
): Promise<LpAbStatsStore> {
  const rows = await aggregateAbEvents(db, 'lp', channel, from, to);
  return applyAggRowsToStore(emptyLpStats(), rows);
}

function assertEvent(event: LpAbTrackEvent): void {
  const variants = LP_AB_EXPERIMENTS[event.experiment as keyof typeof LP_AB_EXPERIMENTS];
  if (!variants || !variants.includes(event.variant as never)) throw new Error('Unknown experiment variant');
  if (!['impression', 'click', 'conversion'].includes(event.metric)) throw new Error('Unknown metric');
}

export async function incrementLpAbMetrics(
  db: D1Database,
  events: LpAbTrackEvent[],
  channel: LpAbChannel,
): Promise<void> {
  for (const event of events) assertEvent(event);
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  await insertAbEvents(db, 'lp', channel, events, day);
}

export function withLpRates(stats: LpAbStatsStore) {
  return Object.entries(stats).map(([experiment, variants]) => ({
    experiment,
    variants: Object.entries(variants).map(([variant, values]) => ({
      variant,
      ...values,
      ctr: values.impression ? Number(((values.click / values.impression) * 100).toFixed(2)) : 0,
      cvr: values.impression ? Number(((values.conversion / values.impression) * 100).toFixed(2)) : 0,
    })),
  }));
}

export function lpPageSummary(stats: LpAbStatsStore) {
  const rows = Object.values(stats.page_order || {});
  const views = rows.reduce((sum, row) => sum + row.impression, 0);
  const clicks = rows.reduce((sum, row) => sum + row.click, 0);
  const leads = rows.reduce((sum, row) => sum + row.conversion, 0);
  return {
    views,
    clicks,
    leads,
    ctr: views ? Number(((clicks / views) * 100).toFixed(2)) : 0,
    cvr: views ? Number(((leads / views) * 100).toFixed(2)) : 0,
  };
}
