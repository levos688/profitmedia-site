import type { Env } from './contact-types';
import { sendMetaPageViewEvent } from './meta-capi';

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });

interface MetaEventPayload {
  event?: string;
  eventId?: string;
  pageUrl?: string;
  tracking?: Record<string, string>;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.headers.get('Content-Type')?.includes('application/json') === false) {
    return json({ ok: false, error: 'Invalid content type' }, 415);
  }

  let body: MetaEventPayload;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const event = body.event?.trim();
  const eventId = body.eventId?.trim();
  const pageUrl = body.pageUrl?.trim().slice(0, 2000) || '';

  if (event !== 'PageView' || !eventId || !pageUrl) {
    return json({ ok: false, error: 'Invalid event payload' }, 400);
  }

  const tracking: Record<string, string> = {};
  for (const [key, value] of Object.entries(body.tracking || {})) {
    const trimmed = value?.trim();
    if (trimmed) tracking[key.slice(0, 64)] = trimmed.slice(0, 500);
  }

  const sent = await sendMetaPageViewEvent(env, {
    eventId,
    pageUrl,
    ip: request.headers.get('CF-Connecting-IP') || '',
    userAgent: request.headers.get('User-Agent') || '',
    tracking,
  });

  return json({ ok: sent });
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
