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
  // Legacy aggregate rows stay readable; new traffic uses page-scoped experiments below.
  page_order: ['proof_first', 'mechanism_first'],
  landing_keyword: ['digital-advertising-agency', 'digital-advertising-office'],
  agency_page_order: ['proof_first', 'mechanism_first'],
  agency_cta_copy: ['diagnosis', 'deal_map'],
  agency_popup_mode: ['quiz', 'direct'],
  agency_popup_trigger: ['time_30s', 'scroll_50pct', 'exit_intent'],
  agency_lead_source: ['hero', 'offer', 'sticky', 'auto_popup', 'inline_form'],
  office_page_order: ['proof_first', 'mechanism_first'],
  office_cta_copy: ['diagnosis', 'media_plan'],
  office_popup_mode: ['quiz', 'direct'],
  office_popup_trigger: ['time_30s', 'scroll_50pct', 'exit_intent'],
  office_lead_source: ['hero', 'offer', 'sticky', 'auto_popup', 'inline_form'],
} as const;

export const LP_PAGE_PREFIXES = {
  'digital-advertising-agency': 'agency',
  'digital-advertising-office': 'office',
} as const;

export type LpPageSlug = keyof typeof LP_PAGE_PREFIXES;
export type LpPagePrefix = (typeof LP_PAGE_PREFIXES)[LpPageSlug];

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

export function lpPageSummary(stats: LpAbStatsStore, page?: LpPagePrefix) {
  if (!page) {
    const pageRows = (Object.values(LP_PAGE_PREFIXES) as LpPagePrefix[]).flatMap((prefix) =>
      Object.values(stats[`${prefix}_page_order`] || {}),
    );
    const hasScopedTraffic = pageRows.some(
      (row) => row.impression > 0 || row.click > 0 || row.conversion > 0,
    );
    if (hasScopedTraffic) {
      const views = pageRows.reduce((sum, row) => sum + row.impression, 0);
      const clicks = pageRows.reduce((sum, row) => sum + row.click, 0);
      const leads = pageRows.reduce((sum, row) => sum + row.conversion, 0);
      return {
        views,
        clicks,
        leads,
        ctr: views ? Number(((clicks / views) * 100).toFixed(2)) : 0,
        cvr: views ? Number(((leads / views) * 100).toFixed(2)) : 0,
      };
    }
  }
  const experiment = page ? `${page}_page_order` : 'page_order';
  const rows = Object.values(stats[experiment] || {});
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

export function lpExperimentsForPage(page: LpPagePrefix): string[] {
  return [
    `${page}_page_order`,
    `${page}_cta_copy`,
    `${page}_popup_mode`,
    `${page}_popup_trigger`,
    `${page}_lead_source`,
  ];
}

export type LpAllocation = {
  mode: 'equal' | 'adaptive';
  weights: Record<string, number>;
  leader: string | null;
  reason: string;
};

function equalAllocation(variants: readonly string[], reason = 'Недостаточно данных — равный трафик'): LpAllocation {
  const weights: Record<string, number> = {};
  const share = 1 / Math.max(variants.length, 1);
  variants.forEach((variant, index) => {
    weights[variant] =
      index === variants.length - 1
        ? Number((1 - share * (variants.length - 1)).toFixed(4))
        : Number(share.toFixed(4));
  });
  return { mode: 'equal', weights, leader: null, reason };
}

/**
 * Conservative adaptive allocation for low-volume paid traffic.
 * It never sends 100% to one arm and waits for both exposure and lead signal.
 */
export function computeLpAllocation(
  stats: LpAbStatsStore,
  page: LpPagePrefix,
): Record<string, LpAllocation> {
  const allocations: Record<string, LpAllocation> = {};
  for (const experiment of lpExperimentsForPage(page)) {
    if (experiment.endsWith('_lead_source')) continue;
    const variants =
      LP_AB_EXPERIMENTS[experiment as keyof typeof LP_AB_EXPERIMENTS] as readonly string[];
    const rows = variants.map((variant) => ({
      variant,
      values: stats[experiment]?.[variant] || { impression: 0, click: 0, conversion: 0 },
    }));
    const totalConversions = rows.reduce((sum, row) => sum + row.values.conversion, 0);
    const minImpressions = Math.min(...rows.map((row) => row.values.impression));
    if (totalConversions < 3 || minImpressions < 15) {
      allocations[experiment] = equalAllocation(
        variants,
        `Мало данных: ${totalConversions} лидов, минимум ${minImpressions} показов на вариант`,
      );
      continue;
    }

    const sorted = [...rows].sort((a, b) => {
      const aCvr = a.values.impression ? a.values.conversion / a.values.impression : 0;
      const bCvr = b.values.impression ? b.values.conversion / b.values.impression : 0;
      return bCvr - aCvr || b.values.conversion - a.values.conversion;
    });
    const leader = sorted[0];
    const runner = sorted[1];
    const leaderCvr = leader.values.impression ? leader.values.conversion / leader.values.impression : 0;
    const runnerCvr = runner?.values.impression ? runner.values.conversion / runner.values.impression : 0;
    const lift = runnerCvr > 0 ? leaderCvr / runnerCvr : leader.values.conversion >= 3 ? Infinity : 1;
    if (lift < 1.5) {
      allocations[experiment] = equalAllocation(variants, `Разница пока мала: CVR ×${lift.toFixed(2)}`);
      continue;
    }

    const leaderShare = lift >= 2 && leader.values.conversion >= 5 ? 0.8 : 0.7;
    const weights: Record<string, number> = {};
    variants.forEach((variant) => {
      weights[variant] =
        variant === leader.variant
          ? leaderShare
          : Number(((1 - leaderShare) / (variants.length - 1)).toFixed(4));
    });
    allocations[experiment] = {
      mode: 'adaptive',
      weights,
      leader: leader.variant,
      reason: `Лидер ${leader.variant}: ${Math.round(leaderShare * 100)}% трафика, CVR ×${
        Number.isFinite(lift) ? lift.toFixed(2) : '∞'
      }`,
    };
  }
  return allocations;
}
