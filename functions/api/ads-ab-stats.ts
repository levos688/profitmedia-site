import { isAbStatsAuthorized } from '../lib/ab-stats-auth';
import {
  AB_TIMEZONE,
  ACTIVE_AB_VARIANTS,
  DAILY_TRACKING_SINCE,
  buildWidgetSummary,
  computeHybridAllocation,
  jerusalemDateKey,
  previousPeriod,
  readAbStats,
  readAbStatsRange,
  readDailySeries,
  withRates,
  type AbChannel,
} from './ads-ab-stats-core';
interface Env {
  DONHIN_AB_STATS: KVNamespace;
  AB_DB: D1Database;
  AB_STATS_TOKEN?: string;
}

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParam(value: string | null): string | null {
  if (!value || !DATE_RE.test(value)) return null;
  return value;
}

function buildSlice(
  stats: Awaited<ReturnType<typeof readAbStats>>,
  daily: Awaited<ReturnType<typeof readDailySeries>>,
  mode: 'lifetime' | 'range',
) {
  const summary = buildWidgetSummary(stats);
  return {
    mode,
    experiments: withRates(stats),
    widgets: summary.widgets,
    page: summary.page,
    daily,
  };
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (!isAbStatsAuthorized(request, env.AB_STATS_TOKEN)) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  if (!env.DONHIN_AB_STATS || !env.AB_DB) {
    return json({ ok: false, error: 'Stats storage is not configured' }, 503);
  }

  const url = new URL(request.url);
  const channel: AbChannel = url.searchParams.get('channel') === 'all' ? 'all' : 'fb_ads';
  const today = jerusalemDateKey();
  const preset = url.searchParams.get('preset') || 'all_time';
  const fromParam = parseDateParam(url.searchParams.get('from'));
  const toParam = parseDateParam(url.searchParams.get('to'));
  const compare = url.searchParams.get('compare') === '1' || url.searchParams.get('compare') === 'true';
  const compareFromParam = parseDateParam(url.searchParams.get('compareFrom'));
  const compareToParam = parseDateParam(url.searchParams.get('compareTo'));

  const lifetime = await readAbStats(env.DONHIN_AB_STATS, env.AB_DB, channel);
  const allocationStats =
    channel === 'fb_ads' ? lifetime : await readAbStats(env.DONHIN_AB_STATS, env.AB_DB, 'fb_ads');
  const allocation = computeHybridAllocation(allocationStats);

  const useLifetime = preset === 'all_time' && !fromParam && !toParam;
  const from = fromParam || (useLifetime ? DAILY_TRACKING_SINCE : today);
  const to = toParam || today;

  let primaryStats = lifetime;
  let primaryMode: 'lifetime' | 'range' = 'lifetime';
  let daily = await readDailySeries(env.DONHIN_AB_STATS, env.AB_DB, channel, from, to);

  if (!useLifetime) {
    primaryStats = await readAbStatsRange(env.DONHIN_AB_STATS, env.AB_DB, channel, from, to);
    primaryMode = 'range';
  }

  const primary = buildSlice(primaryStats, daily, primaryMode);

  let comparePayload: ReturnType<typeof buildSlice> | null = null;
  let compareRange: { from: string; to: string } | null = null;
  if (compare && !useLifetime) {
    compareRange =
      compareFromParam && compareToParam
        ? { from: compareFromParam, to: compareToParam }
        : previousPeriod(from, to);
    const compareStats = await readAbStatsRange(
      env.DONHIN_AB_STATS,
      env.AB_DB,
      channel,
      compareRange.from,
      compareRange.to,
    );
    const compareDaily = await readDailySeries(
      env.DONHIN_AB_STATS,
      env.AB_DB,
      channel,
      compareRange.from,
      compareRange.to,
    );
    comparePayload = buildSlice(compareStats, compareDaily, 'range');
  }

  // Backward-compatible channels payload (lifetime) for older clients / dual tabs.
  const [allLifetime, fbLifetime] = await Promise.all([
    channel === 'all' ? Promise.resolve(lifetime) : readAbStats(env.DONHIN_AB_STATS, env.AB_DB, 'all'),
    channel === 'fb_ads' ? Promise.resolve(lifetime) : readAbStats(env.DONHIN_AB_STATS, env.AB_DB, 'fb_ads'),
  ]);

  return json({
    ok: true,
    updatedAt: new Date().toISOString(),
    timezone: AB_TIMEZONE,
    dailyTrackingSince: DAILY_TRACKING_SINCE,
    channel,
    preset,
    range: useLifetime
      ? { from: null, to: null, label: 'За всё время' }
      : { from, to, label: `${from} — ${to}` },
    compareRange,
    allocation,
    /** Serving weights always from fb_ads lifetime — not the table's selected channel/range. */
    allocationChannel: 'fb_ads' as const,
    activeVariants: ACTIVE_AB_VARIANTS,
    primary,
    compare: comparePayload,
    channels: {
      all: {
        label: 'Все визиты (включая тесты)',
        experiments: withRates(allLifetime),
        ...buildWidgetSummary(allLifetime),
      },
      fb_ads: {
        label: 'Только Facebook реклама',
        experiments: withRates(fbLifetime),
        ...buildWidgetSummary(fbLifetime),
      },
    },
  });
}
