import { readAbStats, withRates } from './ab-stats-core';

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
  const token = new URL(request.url).searchParams.get('token')?.trim();

  if (!env.AB_STATS_TOKEN || token !== env.AB_STATS_TOKEN) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  if (!env.DONHIN_AB_STATS) {
    return json({ ok: false, error: 'Stats storage is not configured' }, 503);
  }

  const stats = await readAbStats(env.DONHIN_AB_STATS);
  return json({
    ok: true,
    updatedAt: new Date().toISOString(),
    experiments: withRates(stats),
  });
}
