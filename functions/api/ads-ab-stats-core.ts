import {
  aggregateAbEvents,
  applyAggRowsToStore,
  D1_EVENTS_SINCE,
  insertAbEvents,
  type AbD1Namespace,
} from './ab-d1-store';

export type AbMetric = 'impression' | 'click' | 'conversion';

export type AbChannel = 'all' | 'fb_ads';

export type AbVariantStats = {
  impression: number;
  click: number;
  conversion: number;
};

export type AbStatsStore = Record<string, Record<string, AbVariantStats>>;

const AB_NAMESPACE: AbD1Namespace = 'ads';

export const AB_EXPERIMENTS = {
  hero_copy: ['system', 'pain'],
  sticky_cta: ['diagnosis', 'order_system', 'start_work', 'opt_plan'],
  popup_delay: ['20s', '25s'],
  popup_scroll: ['50pct', '65pct'],
  bottom_copy: ['diagnosis', 'order_system', 'opt_plan'],
  mid_cta: ['diagnosis', 'order_system', 'opt_plan'],
  offer_cta: ['diagnosis', 'order_system', 'opt_plan'],
  lead_source: ['simple', 'popup_quiz', 'popup_simple', 'mid_cta', 'offer_cta', 'sticky', 'hero_cta'],
} as const;

/** Live traffic variants only (retired rows stay in stats but get 0 traffic). */
export const ACTIVE_AB_VARIANTS: Record<string, readonly string[]> = {
  hero_copy: ['system', 'pain'],
  sticky_cta: ['diagnosis', 'opt_plan'],
  popup_delay: ['20s', '25s'],
  popup_scroll: ['50pct', '65pct'],
  bottom_copy: ['diagnosis', 'opt_plan'],
  mid_cta: ['diagnosis', 'opt_plan'],
  offer_cta: ['diagnosis', 'opt_plan'],
};

export const AB_TIMEZONE = 'Asia/Jerusalem';
/** Daily buckets start from this date; older totals remain in lifetime keys only. */
export const DAILY_TRACKING_SINCE = '2026-07-26';

const STATS_KEYS: Record<AbChannel, string> = {
  all: 'pm_ads_ab_stats_v1',
  fb_ads: 'pm_ads_ab_stats_v1_fb',
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

export function jerusalemDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function dailyStatsKey(channel: AbChannel, day: string): string {
  return `${STATS_KEYS[channel]}_day_${day}`;
}

export function enumerateDays(from: string, to: string): string[] {
  const start = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
  const days: string[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    days.push(cursor.toISOString().slice(0, 10));
  }
  return days;
}

export function mergeStats(target: AbStatsStore, source: AbStatsStore): AbStatsStore {
  const out = normalizeStats(target);
  for (const [experiment, variants] of Object.entries(AB_EXPERIMENTS)) {
    for (const variant of variants) {
      const row = source[experiment]?.[variant];
      if (!row) continue;
      out[experiment][variant].impression += Number(row.impression) || 0;
      out[experiment][variant].click += Number(row.click) || 0;
      out[experiment][variant].conversion += Number(row.conversion) || 0;
    }
  }
  return out;
}

async function readKvLifetime(kv: KVNamespace, channel: AbChannel): Promise<AbStatsStore> {
  const raw = await kv.get<AbStatsStore>(STATS_KEYS[channel], 'json');
  return normalizeStats(raw);
}

async function readKvDay(kv: KVNamespace, channel: AbChannel, day: string): Promise<AbStatsStore> {
  const raw = await kv.get<AbStatsStore>(dailyStatsKey(channel, day), 'json');
  return normalizeStats(raw);
}

async function readD1Range(
  db: D1Database,
  channel: AbChannel,
  from?: string,
  to?: string,
): Promise<AbStatsStore> {
  const rows = await aggregateAbEvents(db, AB_NAMESPACE, channel, from, to);
  return applyAggRowsToStore(emptyStats(), rows);
}

/** Lifetime = frozen KV baseline + all D1 events (no more KV puts on track). */
export async function readAbStats(
  kv: KVNamespace,
  db: D1Database,
  channel: AbChannel = 'all',
): Promise<AbStatsStore> {
  const [kvPart, d1Part] = await Promise.all([
    readKvLifetime(kv, channel),
    readD1Range(db, channel),
  ]);
  return mergeStats(kvPart, d1Part);
}

export async function readAbStatsDay(
  kv: KVNamespace,
  db: D1Database,
  channel: AbChannel,
  day: string,
): Promise<AbStatsStore> {
  if (day < D1_EVENTS_SINCE) {
    return readKvDay(kv, channel, day);
  }
  const [kvPart, d1Part] = await Promise.all([
    day === D1_EVENTS_SINCE ? readKvDay(kv, channel, day) : Promise.resolve(emptyStats()),
    readD1Range(db, channel, day, day),
  ]);
  return mergeStats(kvPart, d1Part);
}

export async function readAbStatsRange(
  kv: KVNamespace,
  db: D1Database,
  channel: AbChannel,
  from: string,
  to: string,
): Promise<AbStatsStore> {
  const days = enumerateDays(from, to);
  if (!days.length) return emptyStats();
  const stores = await Promise.all(days.map((day) => readAbStatsDay(kv, db, channel, day)));
  return stores.reduce((acc, store) => mergeStats(acc, store), emptyStats());
}

export async function readAllAbStats(
  kv: KVNamespace,
  db: D1Database,
): Promise<Record<AbChannel, AbStatsStore>> {
  const [all, fb_ads] = await Promise.all([
    readAbStats(kv, db, 'all'),
    readAbStats(kv, db, 'fb_ads'),
  ]);
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

function applyEventsToStore(stats: AbStatsStore, events: AbTrackEvent[]): AbStatsStore {
  const next = normalizeStats(stats);
  for (const event of events) {
    next[event.experiment][event.variant][event.metric] += 1;
  }
  return next;
}

/** Append events to D1 (batched INSERT). No KV puts. */
export async function incrementAbMetrics(
  db: D1Database,
  events: AbTrackEvent[],
  channel: AbChannel = 'all',
): Promise<void> {
  if (!events.length) return;
  for (const event of events) assertTrackEvent(event);
  await insertAbEvents(db, AB_NAMESPACE, channel, events, jerusalemDateKey());
}

export async function incrementAbMetric(
  db: D1Database,
  experiment: string,
  variant: string,
  metric: AbMetric,
  channel: AbChannel = 'all',
): Promise<void> {
  return incrementAbMetrics(db, [{ experiment, variant, metric }], channel);
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

export type AbMetricTotals = {
  impression: number;
  click: number;
  conversion: number;
  ctr: number;
  cvr: number;
};

export function sumExperiment(
  stats: AbStatsStore,
  experiment: string,
  onlyActive = false,
): AbMetricTotals {
  const variants = onlyActive
    ? ACTIVE_AB_VARIANTS[experiment] || Object.keys(stats[experiment] || {})
    : Object.keys(stats[experiment] || {});
  let impression = 0;
  let click = 0;
  let conversion = 0;
  for (const variant of variants) {
    const row = stats[experiment]?.[variant];
    if (!row) continue;
    impression += row.impression;
    click += row.click;
    conversion += row.conversion;
  }
  return {
    impression,
    click,
    conversion,
    ctr: impression > 0 ? Number(((click / impression) * 100).toFixed(2)) : 0,
    cvr: impression > 0 ? Number(((conversion / impression) * 100).toFixed(2)) : 0,
  };
}

export type AbWidgetSummary = {
  id: string;
  label: string;
  impression: number;
  click: number;
  conversion: number;
  ctr: number;
  cvr: number;
};

export type AbPageSummary = {
  views: number;
  leads: number;
  cvr: number;
};

export function buildWidgetSummary(stats: AbStatsStore): {
  widgets: AbWidgetSummary[];
  page: AbPageSummary;
} {
  const sticky = sumExperiment(stats, 'sticky_cta', true);
  const delay = sumExperiment(stats, 'popup_delay', true);
  const scroll = sumExperiment(stats, 'popup_scroll', true);
  const forms = sumExperiment(stats, 'lead_source', false);
  const heroClicks = stats.lead_source?.hero_cta?.click || 0;
  const formLeads = Math.max(0, forms.conversion);
  const formImpressions = Math.max(
    0,
    forms.impression - (stats.lead_source?.hero_cta?.impression || 0),
  );

  const mid = sumExperiment(stats, 'mid_cta', true);
  const offer = sumExperiment(stats, 'offer_cta', true);
  const bottom = sumExperiment(stats, 'bottom_copy', true);

  const widgets: AbWidgetSummary[] = [
    { id: 'sticky_cta', label: 'Sticky CTA (mobile)', ...sticky },
    { id: 'mid_cta', label: 'Mid-page CTA', ...mid },
    { id: 'offer_cta', label: 'Offer / diagnosis block', ...offer },
    { id: 'bottom_copy', label: 'Contact form copy', ...bottom },
    { id: 'popup_delay', label: 'Popup timer', ...delay },
    { id: 'popup_scroll', label: 'Popup scroll', ...scroll },
    {
      id: 'lead_source',
      label: 'Lead sources',
      impression: formImpressions,
      click: forms.click + heroClicks,
      conversion: formLeads,
      ctr:
        formImpressions > 0
          ? Number((((forms.click + heroClicks) / formImpressions) * 100).toFixed(2))
          : 0,
      cvr: formImpressions > 0 ? Number(((formLeads / formImpressions) * 100).toFixed(2)) : 0,
    },
  ];

  const views = sticky.impression;
  const leads =
    formLeads > 0 ? formLeads : Math.max(sticky.conversion, delay.conversion, scroll.conversion);
  const page: AbPageSummary = {
    views,
    leads,
    cvr: views > 0 ? Number(((leads / views) * 100).toFixed(2)) : 0,
  };

  return { widgets, page };
}

export type AbDailyPoint = {
  date: string;
  views: number;
  leads: number;
  cvr: number;
};

export async function readDailySeries(
  kv: KVNamespace,
  db: D1Database,
  channel: AbChannel,
  from: string,
  to: string,
): Promise<AbDailyPoint[]> {
  const days = enumerateDays(from, to);
  const stores = await Promise.all(days.map((day) => readAbStatsDay(kv, db, channel, day)));
  return days.map((date, index) => {
    const summary = buildWidgetSummary(stores[index]);
    return {
      date,
      views: summary.page.views,
      leads: summary.page.leads,
      cvr: summary.page.cvr,
    };
  });
}

export type AbAllocation = {
  mode: 'equal' | 'hybrid' | 'catchup' | 'solo';
  weights: Record<string, number>;
  leader: string | null;
  reason: string;
};

const MIN_LEADER_LEADS = 2;
const LIFT_SOFT = 1.5;
const LIFT_CLEAR = 2.0;
const LIFT_CRUSH = 3.0;
const SOFT_RETIRE_LAG_IMP = 40;
/** Zero-CVR challenger with enough impressions → early clear/crush tiers (solo still needs ≥40). */
const ZERO_CVR_CLEAR_IMP = 8;
const ZERO_CVR_CRUSH_IMP = 15;
/** Brand-new arm (0 impressions): explore at most this share so winners keep delivering leads. */
const NEWCOMER_EXPLORE_SHARE = 0.3;

function variantScore(experiment: string, values: AbVariantStats): number {
  const cvr = values.impression > 0 ? (values.conversion / values.impression) * 100 : 0;
  const ctr = values.impression > 0 ? (values.click / values.impression) * 100 : 0;
  if (
    experiment === 'sticky_cta' ||
    experiment === 'bottom_copy' ||
    experiment === 'mid_cta' ||
    experiment === 'offer_cta'
  ) {
    return values.conversion * 1000 + cvr * 10 + ctr;
  }
  return values.conversion * 1000 + cvr;
}

function cvrOf(values: AbVariantStats): number {
  return values.impression > 0 ? values.conversion / values.impression : 0;
}

function equalWeights(variants: readonly string[], reason?: string): AbAllocation {
  const weights: Record<string, number> = {};
  const weight = Number((1 / Math.max(variants.length, 1)).toFixed(4));
  for (const variant of variants) weights[variant] = weight;
  if (variants.length === 2) {
    weights[variants[0]] = 0.5;
    weights[variants[1]] = 0.5;
  }
  return {
    mode: 'equal',
    weights,
    leader: null,
    reason: reason || 'Недостаточно данных — равный трафик',
  };
}

type AbRow = { variant: string; values: AbVariantStats };

/** Better of two rows by CVR (then conversions, then score). */
function betterRow(experiment: string, a: AbRow, b: AbRow): AbRow {
  const cvrA = cvrOf(a.values);
  const cvrB = cvrOf(b.values);
  if (cvrA !== cvrB) return cvrA > cvrB ? a : b;
  if (a.values.conversion !== b.values.conversion) {
    return a.values.conversion > b.values.conversion ? a : b;
  }
  return variantScore(experiment, a.values) >= variantScore(experiment, b.values) ? a : b;
}

function pickLeaderAmong(experiment: string, rows: AbRow[]): AbRow {
  return rows.reduce((best, row) => betterRow(experiment, best, row));
}

/**
 * CVR(leader)/CVR(lag). Null if not enough signal.
 * Zero-CVR lag: early clear/crush by impressions; Infinity (solo-eligible) at ≥40.
 */
function cvrLift(leader: AbVariantStats, lag: AbVariantStats): number | null {
  if (leader.conversion < MIN_LEADER_LEADS) return null;
  const lagCvr = cvrOf(lag);
  if (lagCvr <= 0) {
    if (lag.impression >= SOFT_RETIRE_LAG_IMP) return Number.POSITIVE_INFINITY;
    if (lag.impression >= ZERO_CVR_CRUSH_IMP) return LIFT_CRUSH;
    if (lag.impression >= ZERO_CVR_CLEAR_IMP) return LIFT_CLEAR;
    return null;
  }
  return cvrOf(leader) / lagCvr;
}

function formatLift(lift: number): string {
  if (!Number.isFinite(lift)) return '∞';
  return lift.toFixed(1);
}

function impNote(rows: AbRow[]): string {
  return rows.map((r) => r.values.impression).join('/');
}

function tierForLift(lift: number): { share: number; label: string } | null {
  if (lift >= LIFT_CRUSH) return { share: 0.9, label: 'Разгром' };
  if (lift >= LIFT_CLEAR) return { share: 0.8, label: 'Явный лидер' };
  if (lift >= LIFT_SOFT) return { share: 0.65, label: 'Мягкий лидер' };
  return null;
}

/** Leader keeps `leaderShare`; remainder split equally among alive challengers; retired = 0. */
function weightsWithLeader(
  allVariants: readonly string[],
  leaderId: string,
  aliveOtherIds: string[],
  retiredIds: string[],
  leaderShare: number,
  mode: AbAllocation['mode'],
  reason: string,
): AbAllocation {
  const weights: Record<string, number> = {};
  for (const id of allVariants) weights[id] = 0;
  for (const id of retiredIds) weights[id] = 0;

  if (aliveOtherIds.length === 0) {
    weights[leaderId] = 1;
    return { mode: 'solo', weights, leader: leaderId, reason };
  }

  const lead = Number(Math.min(0.9, leaderShare).toFixed(2));
  const rest = Number((1 - lead).toFixed(4));
  weights[leaderId] = lead;
  let assigned = 0;
  aliveOtherIds.forEach((id, index) => {
    if (index === aliveOtherIds.length - 1) {
      weights[id] = Number((rest - assigned).toFixed(4));
    } else {
      const each = Number((rest / aliveOtherIds.length).toFixed(4));
      weights[id] = each;
      assigned += each;
    }
  });

  return { mode, weights, leader: leaderId, reason };
}

function allocateExperiment(experiment: string, variants: readonly string[], rows: AbRow[]): AbAllocation {
  if (rows.length < 2) return equalWeights(variants);

  const leader = pickLeaderAmong(experiment, rows);
  const others = rows.filter((r) => r.variant !== leader.variant);
  const lifts = others.map((row) => ({ row, lift: cvrLift(leader.values, row.values) }));
  const retiredIds = lifts
    .filter(
      ({ row, lift }) =>
        lift != null && lift >= LIFT_CRUSH && row.values.impression >= SOFT_RETIRE_LAG_IMP,
    )
    .map(({ row }) => row.variant);
  const aliveOthers = others.filter((r) => !retiredIds.includes(r.variant));
  const note = impNote(rows);

  if (aliveOthers.length === 0) {
    return weightsWithLeader(
      variants,
      leader.variant,
      [],
      retiredIds,
      1,
      'solo',
      `Победа ${leader.variant}: solo 100% (показов ${note}). Добавь новый вариант для следующего теста.`,
    );
  }

  const signaled = lifts.filter(({ row, lift }) => !retiredIds.includes(row.variant) && lift != null);
  // Shift only when every alive challenger has a lift signal (avoid over-shifting on partial data).
  if (signaled.length === aliveOthers.length && signaled.length > 0) {
    const minLift = Math.min(
      ...signaled.map(({ lift }) => (lift == null || !Number.isFinite(lift) ? LIFT_CRUSH : lift)),
    );
    const tier = tierForLift(minLift);
    if (tier) {
      const split =
        aliveOthers.length === 1
          ? `${Math.round(tier.share * 100)}/${Math.round((1 - tier.share) * 100)}`
          : `${Math.round(tier.share * 100)}% лидеру, остальное поровну`;
      return weightsWithLeader(
        variants,
        leader.variant,
        aliveOthers.map((r) => r.variant),
        retiredIds,
        tier.share,
        'hybrid',
        `${tier.label} ${leader.variant}: ${split} (CVR ×${formatLift(minLift)}, показов ${note})`,
      );
    }
  }

  // Exploration only for true newcomers (0 impressions), and only when established
  // arms already have lead signal worth protecting. 0 leads everywhere → equal, never fake 70/30.
  const newcomers = rows.filter((r) => r.values.impression === 0);
  const established = rows.filter((r) => r.values.impression > 0);
  if (newcomers.length > 0 && established.length > 0) {
    const establishedMaxLeads = Math.max(...established.map((r) => r.values.conversion));
    if (establishedMaxLeads < MIN_LEADER_LEADS) {
      const newIds = newcomers.map((r) => r.variant).join(', ');
      return equalWeights(
        variants,
        `Новый вариант (${newIds}), у текущих мало лидов — равный трафик (показов ${note})`,
      );
    }
    const weights: Record<string, number> = {};
    for (const id of variants) weights[id] = 0;

    const exploreTotal = NEWCOMER_EXPLORE_SHARE;
    const keepTotal = Number((1 - exploreTotal).toFixed(4));
    let exploreAssigned = 0;
    newcomers.forEach((row, index) => {
      if (index === newcomers.length - 1) {
        weights[row.variant] = Number((exploreTotal - exploreAssigned).toFixed(4));
      } else {
        const each = Number((exploreTotal / newcomers.length).toFixed(4));
        weights[row.variant] = each;
        exploreAssigned += each;
      }
    });

    // Majority stays on arms that already have data (protect conversion rate).
    const establishedLeader = pickLeaderAmong(experiment, established);
    if (established.length === 1) {
      weights[established[0].variant] = keepTotal;
    } else {
      let keepAssigned = 0;
      established.forEach((row, index) => {
        if (index === established.length - 1) {
          weights[row.variant] = Number((keepTotal - keepAssigned).toFixed(4));
        } else {
          const each = Number((keepTotal / established.length).toFixed(4));
          weights[row.variant] = each;
          keepAssigned += each;
        }
      });
    }

    const newIds = newcomers.map((r) => r.variant).join(', ');
    return {
      mode: 'catchup',
      weights,
      leader: establishedLeader.variant,
      reason: `Новый вариант (${newIds}): разведка ≤${Math.round(exploreTotal * 100)}%, проверенные ≥${Math.round(keepTotal * 100)}% (показов ${note})`,
    };
  }

  const maxLeads = Math.max(...rows.map((r) => r.values.conversion));
  return equalWeights(
    variants,
    maxLeads < MIN_LEADER_LEADS
      ? `Близко / мало лидов — равный трафик (показов ${note})`
      : `Близко по CVR — равный трафик (показов ${note})`,
  );
}

/**
 * Signal ladder (2+ arms):
 * equal → newcomer explore ≤30% (only if established has ≥2 leads) → 65%/80%/90% → solo (≥3×, ≥40 imp).
 * Never boost a weaker under-sampled arm just because it has fewer impressions.
 */
export function computeHybridAllocation(stats: AbStatsStore): Record<string, AbAllocation> {
  const out: Record<string, AbAllocation> = {};

  for (const [experiment, variants] of Object.entries(ACTIVE_AB_VARIANTS)) {
    const rows = variants.map((variant) => ({
      variant,
      values: stats[experiment]?.[variant] || { impression: 0, click: 0, conversion: 0 },
    }));
    out[experiment] = allocateExperiment(experiment, variants, rows);
  }

  return out;
}

export function shiftDate(day: string, deltaDays: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

export function previousPeriod(from: string, to: string): { from: string; to: string } {
  const days = enumerateDays(from, to).length || 1;
  const prevTo = shiftDate(from, -1);
  const prevFrom = shiftDate(prevTo, -(days - 1));
  return { from: prevFrom, to: prevTo };
}
