export type AbMetric = 'impression' | 'click' | 'conversion';

export type AbVariantStats = {
  impression: number;
  click: number;
  conversion: number;
};

export type AbStatsStore = Record<string, Record<string, AbVariantStats>>;

export const AB_EXPERIMENTS = {
  sticky_cta: ['get_consult', 'free_consult'],
  popup_delay: ['15s', '18s', '22s'],
  popup_scroll: ['80pct', '60pct'],
} as const;

const STATS_KEY = 'donhin_ab_stats_v1';

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

export async function readAbStats(kv: KVNamespace): Promise<AbStatsStore> {
  const raw = await kv.get<AbStatsStore>(STATS_KEY, 'json');
  return normalizeStats(raw);
}

export async function incrementAbMetric(
  kv: KVNamespace,
  experiment: string,
  variant: string,
  metric: AbMetric,
): Promise<AbStatsStore> {
  if (!(experiment in AB_EXPERIMENTS)) {
    throw new Error('Unknown experiment');
  }
  if (!AB_EXPERIMENTS[experiment as keyof typeof AB_EXPERIMENTS].includes(variant)) {
    throw new Error('Unknown variant');
  }

  const stats = await readAbStats(kv);
  stats[experiment][variant][metric] += 1;
  await kv.put(STATS_KEY, JSON.stringify(stats));
  return stats;
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
