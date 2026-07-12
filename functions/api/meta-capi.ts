import type { LeadData } from './contact-types';

const PIXEL_ID = '517991158551582';

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

export async function sendMetaLeadEvent(
  env: { META_CAPI_ACCESS_TOKEN?: string },
  lead: LeadData,
  eventId?: string,
): Promise<void> {
  const accessToken = env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken || !eventId) return;

  const userData: Record<string, string | string[]> = {
    client_ip_address: lead.ip,
    client_user_agent: lead.userAgent,
  };

  if (lead.tracking.fbc) userData.fbc = lead.tracking.fbc;
  if (lead.tracking.fbp) userData.fbp = lead.tracking.fbp;

  const phone = normalizePhone(lead.phone);
  if (phone) userData.ph = [await sha256(phone)];

  const firstName = normalizeName(lead.name).split(/\s+/)[0];
  if (firstName) userData.fn = [await sha256(firstName)];

  const payload = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(lead.submittedAt.getTime() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: lead.pageUrl || lead.landingUrl,
        user_data: userData,
      },
    ],
    access_token: accessToken,
  };

  const res = await fetch(`https://graph.facebook.com/v21.0/${PIXEL_ID}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Meta CAPI Lead failed:', err);
  }
}
