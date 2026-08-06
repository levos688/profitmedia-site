import { isAbStatsAuthorized } from '../lib/ab-stats-auth';
import {
  lpPageSummary,
  readLpAbStats,
  withLpRates,
  type LpAbChannel,
} from './lp-ab-stats-core';

interface Env {
  AB_DB: D1Database;
  AB_STATS_TOKEN?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequestGet(context: { request: Request; env: Env }) {
  if (!isAbStatsAuthorized(context.request, context.env.AB_STATS_TOKEN)) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }
  if (!context.env.AB_DB) return json({ ok: false, error: 'Stats storage is not configured' }, 503);

  const url = new URL(context.request.url);
  const channel: LpAbChannel = url.searchParams.get('channel') === 'all' ? 'all' : 'google_ads';
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');
  const from = fromParam && DATE_RE.test(fromParam) ? fromParam : undefined;
  const to = toParam && DATE_RE.test(toParam) ? toParam : undefined;
  const stats = await readLpAbStats(context.env.AB_DB, channel, from, to);

  return json({
    ok: true,
    updatedAt: new Date().toISOString(),
    channel,
    range: { from: from || null, to: to || null },
    page: lpPageSummary(stats),
    experiments: withLpRates(stats),
  });
}
