import type { ContactPayload, Env, LeadData, UtmParams } from './contact-types';
import { buildDonhinLeadText, getDonhinRecipients } from './donhin-lead';

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });

function formatLeadDate(date: Date): string {
  const tz = 'Asia/Jerusalem';
  const day = date.toLocaleString('en-GB', { timeZone: tz, day: 'numeric' });
  const month = date.toLocaleString('en-GB', { timeZone: tz, month: 'long' });
  const year = date.toLocaleString('en-GB', { timeZone: tz, year: 'numeric' });
  const time = date.toLocaleString('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${day} ${month} ${year}, ${time}`;
}

function formatUtm(utm: UtmParams): string {
  const entries = Object.entries(utm).filter(([, v]) => v);
  if (!entries.length) return '(none)';
  return entries.map(([k, v]) => `${k}=${v}`).join('&');
}

function buildDefaultLeadText(lead: LeadData): string {
  return [
    lead.client ? 'Client: ' + lead.client : '',
    lead.formType ? 'Form: ' + lead.formType : '',
    lead.quizAnswer ? 'Quiz: ' + lead.quizAnswer : '',
    'Name: ' + lead.name,
    'Phone: ' + lead.phone,
    'Mail: ' + (lead.email || '(not provided)'),
    '',
    'Date: ' + formatLeadDate(lead.submittedAt),
    '',
    'Page URL: ' + (lead.pageUrl || '(unknown)'),
    'Landing URL: ' + (lead.landingUrl || lead.pageUrl || '(unknown)'),
    'Referrer: ' + (lead.referrer || lead.refererHeader || '(direct)'),
    'UTM: ' + formatUtm(lead.utm),
    '',
    'Additional:',
    'Country: ' + (lead.country || '(unknown)'),
    'IP: ' + (lead.ip || '(unknown)'),
    'Language: ' + (lead.language || '(unknown)'),
    'User-Agent: ' + (lead.userAgent || '(unknown)'),
  ]
    .filter(Boolean)
    .join('\n');
}

function buildLeadText(lead: LeadData, recipients?: string[]): string {
  if (lead.client === 'donhin') return buildDonhinLeadText(lead, recipients);
  return buildDefaultLeadText(lead);
}

function getRecipients(env: Env, lead: LeadData): string[] {
  if (lead.client === 'donhin') return getDonhinRecipients(env);
  return [env.CONTACT_EMAIL || 'lev@profitmedia.co.il'];
}

function getSubject(lead: LeadData): string {
  if (lead.client === 'donhin') return 'New Lead Donhin';
  return lead.client ? `ProfitMedia Lead — ${lead.client}` : 'ProfitMedia Lead';
}

async function sendEmail(env: Env, lead: LeadData) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.FROM_EMAIL || 'Profit Media <onboarding@resend.dev>';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const recipients = getRecipients(env, lead);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: getSubject(lead),
      text: buildLeadText(lead, recipients),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Email failed: ${err}`);
  }
}

async function sendTelegram(env: Env, lead: LeadData) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  const recipients =
    lead.client === 'donhin' ? getDonhinRecipients(env) : [env.CONTACT_EMAIL || 'lev@profitmedia.co.il'];

  const text = [
    lead.client === 'donhin' ? '📩 New Lead Donhin' : lead.client ? `📩 ProfitMedia Lead — ${lead.client}` : '📩 ProfitMedia Lead',
    lead.client === 'donhin' ? `Sent to: ${recipients.join(', ')}` : '',
    '',
    lead.quizAnswer ? `Quiz: ${lead.quizAnswer}` : '',
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    `Mail: ${lead.email || '(not provided)'}`,
    '',
    formatLeadDate(lead.submittedAt),
    '',
    `Page: ${lead.pageUrl || '(unknown)'}`,
    lead.landingUrl && lead.landingUrl !== lead.pageUrl
      ? `Landing: ${lead.landingUrl}`
      : '',
    lead.referrer || lead.refererHeader
      ? `Referrer: ${lead.referrer || lead.refererHeader}`
      : '',
    Object.keys(lead.utm).length ? `UTM: ${formatUtm(lead.utm)}` : '',
    lead.country ? `Country: ${lead.country}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Telegram failed:', err);
  }
}

function pickUtm(body: ContactPayload): UtmParams {
  const utm = body.utm || {};
  const out: UtmParams = {};
  const keys = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'gclid',
    'fbclid',
  ] as const;
  for (const key of keys) {
    const value = utm[key]?.trim();
    if (value) out[key] = value.slice(0, 500);
  }
  return out;
}

function pickTracking(body: ContactPayload): Record<string, string> {
  const tracking = body.tracking || {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tracking)) {
    const trimmed = value?.trim();
    if (trimmed) out[key.slice(0, 64)] = trimmed.slice(0, 500);
  }
  return out;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.headers.get('Content-Type')?.includes('application/json') === false) {
    return json({ ok: false, error: 'Invalid content type' }, 415);
  }

  let body: ContactPayload;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const name = body.name?.trim();
  const phone = body.phone?.trim();
  const email = body.email?.trim() || '';

  if (!name || name.length < 2) {
    return json({ ok: false, error: 'Name required' }, 400);
  }

  if (!phone || !/^[0-9\-+() ]{9,18}$/.test(phone)) {
    return json({ ok: false, error: 'Valid phone required' }, 400);
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'Invalid email' }, 400);
  }

  const lead: LeadData = {
    name,
    phone,
    email,
    pageUrl: body.pageUrl?.trim().slice(0, 2000) || '',
    landingUrl: body.landingUrl?.trim().slice(0, 2000) || '',
    referrer: body.referrer?.trim().slice(0, 2000) || '',
    utm: pickUtm(body),
    tracking: pickTracking(body),
    language: body.language?.trim().slice(0, 64) || '',
    client: body.client?.trim().slice(0, 64) || '',
    quizAnswer: body.quizAnswer?.trim().slice(0, 64) || '',
    formType: body.formType?.trim().slice(0, 32) || '',
    ip: request.headers.get('CF-Connecting-IP') || '',
    country: request.headers.get('CF-IPCountry') || '',
    userAgent: request.headers.get('User-Agent') || '',
    refererHeader: request.headers.get('Referer') || '',
    submittedAt: new Date(),
  };

  try {
    await sendEmail(env, lead);
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'Email delivery failed' }, 502);
  }

  try {
    await sendTelegram(env, lead);
  } catch (err) {
    console.error(err);
  }

  return json({ ok: true });
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
