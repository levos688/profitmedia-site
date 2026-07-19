export type AbMetric = 'impression' | 'click' | 'conversion';

export type AbChannel = 'all' | 'fb_ads';

export type AbVariantStats = {
  impression: number;
  click: number;
  conversion: number;
};

export type AbStatsStore = Record<string, Record<string, AbVariantStats>>;

export const AB_EXPERIMENTS = {
  sticky_cta: ['get_consult', 'free_consult'],
  popup_delay: ['15s', '18s', '22s', '25s'],
  popup_scroll: ['80pct', '60pct', '50pct'],
} as const;

const STATS_KEYS: Record<AbChannel, string> = {
  all: 'donhin_ab_stats_v1',
  fb_ads: 'donhin_ab_stats_v1_fb',
};

export function emptyStats(): AbStatsStore {
  const store: AbStatsStore = {};
  for (const [experiment, variants] of Object.entries(AB_EXPERIMENTS)) {
    store[experiment] = {};
    for (const variant of variants) {
      store[experiment][variant] = { impression: 0, click: 0, conversion: 0 };
    }
  }
  return store;
}

export function normalizeStats(raw: AbStatsStore | null): AbStatsStore {
  const base = emptyStats();
  if (!raw) return base;

  for (const [experiment, variants] of Object.entries(AB_EXPERIMENTS)) {
    for (const variant of variants) {
      const current = raw[experiment]?.[variant];
      if (!current) continue;
      base[experiment][variant] = {
        impression: Number(current.impression) || 0,
        click: Number(current.click) || 0,
        conversion: Number(current.conversion) || 0,
      };
    }
  }

  return base;
}

export async function readAbStats(kv: KVNamespace, channel: AbChannel = 'all'): Promise<AbStatsStore> {
  const raw = await kv.get<AbStatsStore>(STATS_KEYS[channel], 'json');
  return normalizeStats(raw);
}

export async function readAllAbStats(kv: KVNamespace): Promise<Record<AbChannel, AbStatsStore>> {
  const [all, fb_ads] = await Promise.all([readAbStats(kv, 'all'), readAbStats(kv, 'fb_ads')]);
  return { all, fb_ads };
}

export type AbTrackEvent = {
  experiment: string;
  variant: string;
  metric: AbMetric;
};

function assertTrackEvent(event: AbTrackEvent): void {
  if (!(event.experiment in AB_EXPERIMENTS)) {
    throw new Error('Unknown experiment');
  }
  const variants = AB_EXPERIMENTS[event.experiment as keyof typeof AB_EXPERIMENTS];
  if (!variants.includes(event.variant as (typeof variants)[number])) {
    throw new Error('Unknown variant');
  }
  if (!['impression', 'click', 'conversion'].includes(event.metric)) {
    throw new Error('Unknown metric');
  }
}

/** Apply many increments in one read/write so parallel metrics do not overwrite each other. */
export async function incrementAbMetrics(
  kv: KVNamespace,
  events: AbTrackEvent[],
  channel: AbChannel = 'all',
): Promise<AbStatsStore> {
  if (!events.length) {
    return readAbStats(kv, channel);
  }

  for (const event of events) assertTrackEvent(event);

  const stats = await readAbStats(kv, channel);
  for (const event of events) {
    stats[event.experiment][event.variant][event.metric] += 1;
  }
  await kv.put(STATS_KEYS[channel], JSON.stringify(stats));
  return stats;
}

export async function incrementAbMetric(
  kv: KVNamespace,
  experiment: string,
  variant: string,
  metric: AbMetric,
  channel: AbChannel = 'all',
): Promise<AbStatsStore> {
  return incrementAbMetrics(kv, [{ experiment, variant, metric }], channel);
}

export function withRates(stats: AbStatsStore) {
  return Object.entries(stats).map(([experiment, variants]) => ({
    experiment,
    variants: Object.entries(variants).map(([variant, values]) => {
      const ctr = values.impression > 0 ? (values.click / values.impression) * 100 : 0;
      const cvr = values.impression > 0 ? (values.conversion / values.impression) * 100 : 0;
      return {
        variant,
        ...values,
        ctr: Number(ctr.toFixed(2)),
        cvr: Number(cvr.toFixed(2)),
      };
    }),
  }));
}
