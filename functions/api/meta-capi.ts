import type { LeadData } from './contact-types';

export interface MetaEventContext {
  eventId: string;
  pageUrl: string;
  ip: string;
  userAgent: string;
  tracking?: Record<string, string>;
  eventTime?: Date;
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  return digits;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function buildUserData(
  ctx: MetaEventContext,
  extra?: { phone?: string; name?: string },
): Record<string, string | string[]> {
  const userData: Record<string, string | string[]> = {
    client_ip_address: ctx.ip,
    client_user_agent: ctx.userAgent,
  };

  const tracking = ctx.tracking || {};
  if (tracking.fbc) userData.fbc = tracking.fbc;
  if (tracking.fbp) userData.fbp = tracking.fbp;

  if (extra?.phone) {
    const phone = normalizePhone(extra.phone);
    if (phone) userData.ph = [phone]; // hashed below
  }
  if (extra?.name) {
    const firstName = normalizeName(extra.name).split(/\s+/)[0];
    if (firstName) userData.fn = [firstName]; // hashed below
  }

  return userData;
}

async function hashUserData(userData: Record<string, string | string[]>): Promise<Record<string, string | string[]>> {
  const out: Record<string, string | string[]> = { ...userData };
  if (Array.isArray(out.ph) && typeof out.ph[0] === 'string') {
    out.ph = [await sha256(out.ph[0])];
  }
  if (Array.isArray(out.fn) && typeof out.fn[0] === 'string') {
    out.fn = [await sha256(out.fn[0])];
  }
  return out;
}

async function sendMetaEvent(
  env: { META_CAPI_ACCESS_TOKEN?: string; META_CAPI_DATASET_ID?: string },
  eventName: 'PageView' | 'Lead',
  ctx: MetaEventContext,
  extra?: { phone?: string; name?: string },
): Promise<boolean> {
  const accessToken = env.META_CAPI_ACCESS_TOKEN;
  const datasetId = env.META_CAPI_DATASET_ID || '2253228458374300';
  if (!accessToken || !ctx.eventId) return false;

  const userData = await hashUserData(buildUserData(ctx, extra));
  const eventTime = ctx.eventTime || new Date();

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(eventTime.getTime() / 1000),
        event_id: ctx.eventId,
        action_source: 'website',
        event_source_url: ctx.pageUrl,
        user_data: userData,
      },
    ],
    access_token: accessToken,
  };

  const res = await fetch(`https://graph.facebook.com/v21.0/${datasetId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Meta CAPI ${eventName} failed:`, err);
    return false;
  }

  return true;
}

export async function sendMetaPageViewEvent(
  env: { META_CAPI_ACCESS_TOKEN?: string; META_CAPI_DATASET_ID?: string },
  ctx: MetaEventContext,
): Promise<boolean> {
  return sendMetaEvent(env, 'PageView', ctx);
}

export async function sendMetaLeadEvent(
  env: { META_CAPI_ACCESS_TOKEN?: string; META_CAPI_DATASET_ID?: string },
  lead: LeadData,
  eventId?: string,
): Promise<boolean> {
  if (!eventId) return false;

  return sendMetaEvent(
    env,
    'Lead',
    {
      eventId,
      pageUrl: lead.pageUrl || lead.landingUrl,
      ip: lead.ip,
      userAgent: lead.userAgent,
      tracking: lead.tracking,
      eventTime: lead.submittedAt,
    },
    { phone: lead.phone, name: lead.name },
  );
}
