import {
  incrementLpAbMetrics,
  type LpAbChannel,
  type LpAbMetric,
  type LpAbTrackEvent,
} from './lp-ab-stats-core';

interface Env {
  AB_DB: D1Database;
}

interface TrackPayload {
  channel?: LpAbChannel;
  events?: Array<{
    experiment?: string;
    variant?: string;
    metric?: LpAbMetric;
  }>;
}

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequestPost(context: { request: Request; env: Env }) {
  if (!context.env.AB_DB) return json({ ok: false, error: 'Stats storage is not configured' }, 503);

  let body: TrackPayload;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const events: LpAbTrackEvent[] = (body.events || []).map((event) => ({
    experiment: (event.experiment || '').trim(),
    variant: (event.variant || '').trim(),
    metric: event.metric as LpAbMetric,
  }));

  if (
    !events.length ||
    events.some(
      (event) =>
        !event.experiment ||
        !event.variant ||
        !['impression', 'click', 'conversion'].includes(event.metric),
    )
  ) {
    return json({ ok: false, error: 'Invalid payload' }, 400);
  }

  try {
    await incrementLpAbMetrics(
      context.env.AB_DB,
      events,
      body.channel === 'google_ads' ? 'google_ads' : 'all',
    );
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: 'Failed to record event' }, 400);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
