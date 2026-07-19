import type { AbChannel, AbMetric, AbTrackEvent } from './ab-stats-core';
import { incrementAbMetrics } from './ab-stats-core';

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
  events?: AbTrackEvent[];
}

function normalizeEvents(body: TrackPayload): AbTrackEvent[] {
  if (Array.isArray(body.events) && body.events.length) {
    return body.events.map((event) => ({
      experiment: (event.experiment || '').trim(),
      variant: (event.variant || '').trim(),
      metric: event.metric,
    }));
  }

  const experiment = body.experiment?.trim() || '';
  const variant = body.variant?.trim() || '';
  const metric = body.metric;
  if (!experiment || !variant || !metric) return [];
  return [{ experiment, variant, metric }];
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

  const events = normalizeEvents(body);
  const channel: AbChannel = body.channel === 'fb_ads' ? 'fb_ads' : 'all';

  if (
    !events.length ||
    events.some(
      (event) =>
        !event.experiment ||
        !event.variant ||
        !event.metric ||
        !['impression', 'click', 'conversion'].includes(event.metric),
    )
  ) {
    return json({ ok: false, error: 'Invalid payload' }, 400);
  }

  try {
    await incrementAbMetrics(env.DONHIN_AB_STATS, events, 'all');
    if (channel === 'fb_ads') {
      await incrementAbMetrics(env.DONHIN_AB_STATS, events, 'fb_ads');
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
