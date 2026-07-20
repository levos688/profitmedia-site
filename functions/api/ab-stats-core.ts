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
  lead_source: ['quiz', 'simple', 'popup_quiz', 'popup_simple', 'hero_cta'],
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

/** Live traffic variants only (retired rows stay in stats but get 0 traffic). */
export const ACTIVE_AB_VARIANTS: Record<string, readonly string[]> = {
  sticky_cta: ['get_consult', 'free_consult'],
  popup_delay: ['22s', '25s'],
  popup_scroll: ['60pct', '50pct'],
};

export type AbAllocation = {
  mode: 'equal' | 'hybrid';
  weights: Record<string, number>;
  leader: string | null;
  reason: string;
};

const HYBRID_MIN_IMPRESSIONS = 40;
const HYBRID_STEP = 0.1;
const HYBRID_MAX_LEADER = 0.85;
const HYBRID_MIN_CHALLENGER = 0.15;

function variantScore(experiment: string, values: AbVariantStats): number {
  const cvr = values.impression > 0 ? (values.conversion / values.impression) * 100 : 0;
  const ctr = values.impression > 0 ? (values.click / values.impression) * 100 : 0;
  if (experiment === 'sticky_cta') {
    return values.conversion * 1000 + cvr * 10 + ctr;
  }
  return values.conversion * 1000 + cvr;
}

function equalWeights(variants: readonly string[]): AbAllocation {
  const weight = Number((1 / variants.length).toFixed(4));
  const weights: Record<string, number> = {};
  for (const variant of variants) weights[variant] = weight;
  // Fix rounding so sum is exactly 1 for 2 variants.
  if (variants.length === 2) {
    weights[variants[0]] = 0.5;
    weights[variants[1]] = 0.5;
  }
  return {
    mode: 'equal',
    weights,
    leader: null,
    reason: 'Недостаточно данных — трафик 50/50',
  };
}

function hybridSteps(minImp: number, leader: AbVariantStats, lag: AbVariantStats): number {
  let steps = 1;
  if (minImp >= 50 && leader.conversion > lag.conversion) steps = 2;
  if (minImp >= 80) {
    const leaderCvr = leader.impression > 0 ? leader.conversion / leader.impression : 0;
    const lagCvr = lag.impression > 0 ? lag.conversion / lag.impression : 0;
    if (leaderCvr >= lagCvr * 1.15) steps = 3;
  }
  if (minImp >= 120 && leader.conversion >= lag.conversion + 2) steps = 4;
  return steps;
}

/** Hybrid allocation: equal until threshold, then shift up to 85/15 toward the leader. */
export function computeHybridAllocation(stats: AbStatsStore): Record<string, AbAllocation> {
  const out: Record<string, AbAllocation> = {};

  for (const [experiment, variants] of Object.entries(ACTIVE_AB_VARIANTS)) {
    const rows = variants.map((variant) => ({
      variant,
      values: stats[experiment]?.[variant] || { impression: 0, click: 0, conversion: 0 },
    }));

    if (rows.length !== 2) {
      out[experiment] = equalWeights(variants);
      continue;
    }

    const [a, b] = rows;
    const minImp = Math.min(a.values.impression, b.values.impression);
    if (minImp < HYBRID_MIN_IMPRESSIONS) {
      out[experiment] = equalWeights(variants);
      out[experiment].reason = `Ждём по ≥${HYBRID_MIN_IMPRESSIONS} показов на вариант (сейчас ${a.values.impression}/${b.values.impression})`;
      continue;
    }

    const scoreA = variantScore(experiment, a.values);
    const scoreB = variantScore(experiment, b.values);
    if (scoreA === scoreB) {
      out[experiment] = equalWeights(variants);
      out[experiment].reason = 'Пока равны — оставляем 50/50';
      continue;
    }

    const leader = scoreA > scoreB ? a : b;
    const lag = scoreA > scoreB ? b : a;
    const steps = hybridSteps(minImp, leader.values, lag.values);
    let leaderWeight = 0.5 + steps * HYBRID_STEP;
    leaderWeight = Math.min(HYBRID_MAX_LEADER, Math.max(0.5 + HYBRID_STEP, leaderWeight));
    const lagWeight = Math.max(HYBRID_MIN_CHALLENGER, Number((1 - leaderWeight).toFixed(2)));
    leaderWeight = Number((1 - lagWeight).toFixed(2));

    out[experiment] = {
      mode: 'hybrid',
      weights: {
        [leader.variant]: leaderWeight,
        [lag.variant]: lagWeight,
      },
      leader: leader.variant,
      reason: `Лидер ${leader.variant}: ${Math.round(leaderWeight * 100)}% / ${Math.round(lagWeight * 100)}% (шаг ${steps})`,
    };
  }

  return out;
}
