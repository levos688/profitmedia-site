import type { AbChannel, AbMetric } from './ab-stats-core';
import { incrementAbMetric } from './ab-stats-core';

interface Env {
  DONHIN_AB_STATS: KVNamespace;
}

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });

interface TrackPayload {
  experiment?: string;
  variant?: string;
  metric?: AbMetric;
  channel?: AbChannel;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (!env.DONHIN_AB_STATS) {
    return json({ ok: false, error: 'Stats storage is not configured' }, 503);
  }

  if (request.headers.get('Content-Type')?.includes('application/json') === false) {
    return json({ ok: false, error: 'Invalid content type' }, 415);
  }

  let body: TrackPayload;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const experiment = body.experiment?.trim() || '';
  const variant = body.variant?.trim() || '';
  const metric = body.metric;
  const channel: AbChannel = body.channel === 'fb_ads' ? 'fb_ads' : 'all';

  if (!experiment || !variant || !metric || !['impression', 'click', 'conversion'].includes(metric)) {
    return json({ ok: false, error: 'Invalid payload' }, 400);
  }

  try {
    await incrementAbMetric(env.DONHIN_AB_STATS, experiment, variant, metric, 'all');
    if (channel === 'fb_ads') {
      await incrementAbMetric(env.DONHIN_AB_STATS, experiment, variant, metric, 'fb_ads');
    }
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'Failed to record event' }, 400);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
