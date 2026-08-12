import type { ContactPayload, Env, LeadData, UtmParams } from './contact-types';
import { buildDonhinLeadText, getDonhinRecipients } from './donhin-lead';
import { sendMetaLeadEvent } from './meta-capi';

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
    lead.vertical ? 'Business field: ' + lead.vertical : '',
    lead.source ? 'Source: ' + lead.source : '',
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
    'Locale: ' + (lead.locale || '(unknown)'),
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
    lead.vertical ? `Business field: ${lead.vertical}` : '',
    lead.source ? `Source: ${lead.source}` : '',
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
    lead.locale ? `Locale: ${lead.locale}` : '',
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

function normalizeContactDevice(raw?: string): string {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'mob' || v === 'mobile' || v === 'm') return 'Mob';
  if (v === 'desk' || v === 'desktop' || v === 'd') return 'Desk';
  return '';
}

/** Map site form → pm-crm page bucket (home | ads | deals | lp). Skip client LPs (donhin, avhun, …). */
function shouldDualWritePmCrm(lead: LeadData): boolean {
  const client = (lead.client || '').toLowerCase();
  if (client && client !== 'profitmedia' && client !== 'pm') return false;
  const blob = `${lead.source} ${lead.pageUrl} ${lead.landingUrl}`.toLowerCase();
  if (blob.includes('donhin') || blob.includes('avhun')) return false;
  return true;
}

function pmCrmPageBucket(lead: LeadData): string {
  const blob = `${lead.source} ${lead.pageUrl} ${lead.landingUrl}`.toLowerCase();
  if (blob.includes('/lp/')) {
    const match = blob.match(/\/lp\/([^\/?#]+)/);
    if (match) return `lp_${match[1]}`;
    return 'lp';
  }
  if (blob.includes('/deals') || blob.includes('deals-meta') || blob.includes('deals-system')) {
    return 'deals';
  }
  if (blob.includes('/ads') || /(^|[^a-z])ads([^a-z]|$)/.test(blob) || blob.includes('ads-meta')) {
    return 'ads';
  }
  if (blob.includes('/about')) return 'about';
  return 'home';
}

/** Pretty acquisition channel for CRM «מקור» column (ChatGPT, Google, …). */
function pmCrmAcquisitionSource(lead: LeadData): string {
  const utm = (lead.utm.utm_source || '').trim().toLowerCase();
  const medium = (lead.utm.utm_medium || '').trim().toLowerCase();
  const ref = `${lead.referrer || ''} ${lead.refererHeader || ''}`.toLowerCase();
  const blob = `${utm} ${ref} ${lead.pageUrl} ${lead.landingUrl}`.toLowerCase();

  if (lead.utm.gclid || lead.utm.gbraid || lead.utm.wbraid) return 'Google';
  if (lead.utm.fbclid) return 'Facebook';

  if (blob.includes('chatgpt')) return 'ChatGPT';
  if (blob.includes('perplexity')) return 'Perplexity';
  if (blob.includes('claude.ai') || blob.includes('anthropic')) return 'Claude';
  if (blob.includes('gemini.google') || utm.includes('gemini')) return 'Gemini';

  if (
    utm === 'fb' ||
    utm === 'facebook' ||
    utm === 'ig' ||
    utm === 'instagram' ||
    utm.startsWith('ri_') ||
    medium === 'facebook' ||
    medium === 'paidsocial' ||
    ref.includes('facebook.com') ||
    ref.includes('instagram.com')
  ) {
    if (utm === 'ig' || utm === 'instagram' || ref.includes('instagram.com')) return 'Instagram';
    return 'Facebook';
  }

  if (utm === 'google' || utm === 'google_ads' || utm === 'adwords' || ref.includes('google.')) {
    return 'Google';
  }
  if (utm === 'tiktok' || ref.includes('tiktok.com')) return 'TikTok';
  if (utm === 'linkedin' || ref.includes('linkedin.com')) return 'LinkedIn';
  if (utm === 'youtube' || ref.includes('youtube.com')) return 'YouTube';
  if (utm === 'bing' || ref.includes('bing.com')) return 'Bing';

  if (utm) {
    // chatgpt.com → ChatGPT already handled; strip common suffixes
    const cleaned = utm.replace(/\.com$/, '').replace(/[._-]+/g, ' ');
    return cleaned.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 64);
  }

  try {
    if (lead.referrer) {
      const host = new URL(lead.referrer).hostname.replace(/^www\./, '');
      if (host && !host.includes('profitmedia')) return host.slice(0, 64);
    }
  } catch {
    /* ignore bad referrer */
  }

  return 'Direct';
}

function hasGoogleAdsClickId(lead: LeadData): boolean {
  return Boolean(lead.utm.gclid || lead.utm.gbraid || lead.utm.wbraid);
}

function pmCrmFormElement(lead: LeadData): string {
  const form = (lead.formType || '').trim();
  if (form) return form.slice(0, 64);
  const src = (lead.source || '').trim();
  if (src) return src.slice(0, 64);
  return 'form';
}

/** Best-effort dual-write into Profit Media CRM. Never fails the contact response. */
async function sendToPmCrm(env: Env, lead: LeadData): Promise<void> {
  const url = env.PM_CRM_INTAKE_URL?.trim();
  const key = env.PM_CRM_INTAKE_KEY?.trim();
  if (!url || !key) return;
  if (!shouldDualWritePmCrm(lead)) return;

  const pageBucket = pmCrmPageBucket(lead);
  const acquisition = pmCrmAcquisitionSource(lead);
  const formElement = pmCrmFormElement(lead);
  const googleClick = hasGoogleAdsClickId(lead);

  // Reuse CRM columns: source = acquisition, audience = channel (Web), ad = on-page element.
  // Exception: Google Ads click IDs keep campaign/audience/term for Ads reporting joins.
  const payload = {
    name: lead.name,
    phone: lead.phone,
    email: lead.email || undefined,
    lead_source: acquisition,
    lead_audience: googleClick ? lead.utm.utm_content || undefined : 'Web',
    lead_ad_id: googleClick
      ? lead.utm.utm_term || formElement
      : formElement,
    lead_campaign: googleClick
      ? lead.utm.utm_campaign || undefined
      : lead.utm.utm_campaign || pageBucket,
    utm_source: lead.utm.utm_source || undefined,
    utm_medium: lead.utm.utm_medium || undefined,
    gclid: lead.utm.gclid || undefined,
    gbraid: lead.utm.gbraid || undefined,
    wbraid: lead.utm.wbraid || undefined,
    quiz_answer: lead.quizAnswer || undefined,
    vertical: lead.vertical || undefined,
    page_url: lead.pageUrl || undefined,
    landing_url: lead.landingUrl || undefined,
    device: lead.device || undefined,
    notes: [
      `channel:Web`,
      `page:${pageBucket}`,
      formElement && `element:${formElement}`,
      lead.device && `device:${lead.device}`,
      lead.source && `source:${lead.source}`,
      lead.formType && `form:${lead.formType}`,
      lead.locale && `locale:${lead.locale}`,
      lead.referrer && `ref:${lead.referrer.slice(0, 180)}`,
    ]
      .filter(Boolean)
      .join(' | '),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Intake-Key': key,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error(`pm-crm intake ${res.status}: ${err.slice(0, 300)}`);
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
    'gbraid',
    'wbraid',
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
    locale: body.locale === 'ru' || body.locale === 'he' ? body.locale : '',
    language: body.language?.trim().slice(0, 64) || '',
    client: body.client?.trim().slice(0, 64) || '',
    quizAnswer: body.quizAnswer?.trim().slice(0, 64) || '',
    formType: body.formType?.trim().slice(0, 64) || '',
    vertical: body.vertical?.trim().slice(0, 200) || '',
    source: body.source?.trim().slice(0, 64) || '',
    device: normalizeContactDevice(body.device),
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

  if (lead.client === 'donhin') {
    try {
      await sendMetaLeadEvent(env, lead, body.eventId?.trim());
    } catch (err) {
      console.error(err);
    }
  }

  try {
    await sendTelegram(env, lead);
  } catch (err) {
    console.error(err);
  }

  try {
    await sendToPmCrm(env, lead);
  } catch (err) {
    console.error('pm-crm dual-write failed:', err);
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
