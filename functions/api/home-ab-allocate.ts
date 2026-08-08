import { computeHybridAllocation, readAbStats } from './home-ab-stats-core';
import { maybeNotifySoloWins } from './ab-solo-notify';

interface Env {
  DONHIN_AB_STATS: KVNamespace;
  AB_DB: D1Database;
  RESEND_API_KEY?: string;
  FROM_EMAIL?: string;
}

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=30',
      'Access-Control-Allow-Origin': '*',
    },
  });

export async function onRequestGet(context: { env: Env }) {
  const { env } = context;

  if (!env.DONHIN_AB_STATS || !env.AB_DB) {
    return json({ ok: false, error: 'Stats storage is not configured' }, 503);
  }

  try {
    const stats = await readAbStats(env.DONHIN_AB_STATS, env.AB_DB, 'fb_ads');
    const allocation = computeHybridAllocation(stats);
    // Fire-and-forget notify; do not block allocate on email latency beyond await (dedup is fast).
    await maybeNotifySoloWins(env, allocation, 'fb_ads');
    return json({
      ok: true,
      channel: 'fb_ads',
      updatedAt: new Date().toISOString(),
      experiments: allocation,
    });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'Failed to compute allocation' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
