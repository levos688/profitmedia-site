import { isAbStatsAuthorized } from '../lib/ab-stats-auth';
import { readAllAbStats, withRates } from './ab-stats-core';

interface Env {
  DONHIN_AB_STATS: KVNamespace;
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

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (!isAbStatsAuthorized(request, env.AB_STATS_TOKEN)) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  if (!env.DONHIN_AB_STATS) {
    return json({ ok: false, error: 'Stats storage is not configured' }, 503);
  }

  const stats = await readAllAbStats(env.DONHIN_AB_STATS);
  return json({
    ok: true,
    updatedAt: new Date().toISOString(),
    channels: {
      all: {
        label: 'Все визиты (включая тесты)',
        experiments: withRates(stats.all),
      },
      fb_ads: {
        label: 'Только Facebook реклама',
        experiments: withRates(stats.fb_ads),
      },
    },
  });
}
