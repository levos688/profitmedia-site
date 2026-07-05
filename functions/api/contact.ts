interface Env {
  RESEND_API_KEY?: string;
  CONTACT_EMAIL?: string;
  FROM_EMAIL?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

interface ContactPayload {
  name?: string;
  phone?: string;
  email?: string;
}

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });

async function sendEmail(env: Env, data: Required<Pick<ContactPayload, 'name' | 'phone'>> & ContactPayload) {
  const apiKey = env.RESEND_API_KEY;
  const to = env.CONTACT_EMAIL || 'lev@profitmedia.co.il';
  const from = env.FROM_EMAIL || 'Profit Media <onboarding@resend.dev>';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const lines = [
    'פנייה חדשה מאתר Profit Media',
    '',
    `שם: ${data.name}`,
    `טלפון: ${data.phone}`,
    data.email ? `מייל: ${data.email}` : 'מייל: (לא צוין)',
    '',
    `זמן: ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}`,
  ];

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `ליד חדש: ${data.name}`,
      text: lines.join('\n'),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Email failed: ${err}`);
  }
}

async function sendTelegram(env: Env, data: Required<Pick<ContactPayload, 'name' | 'phone'>> & ContactPayload) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  const text = [
    '📩 *ליד חדש — Profit Media*',
    '',
    `👤 *שם:* ${data.name}`,
    `📞 *טלפון:* ${data.phone}`,
    data.email ? `📧 *מייל:* ${data.email}` : '',
    '',
    `🕐 ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}`,
  ]
    .filter(Boolean)
    .join('\n');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Telegram failed:', err);
  }
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

  if (!phone || !/^[0-9\-+() ]{9,15}$/.test(phone)) {
    return json({ ok: false, error: 'Valid phone required' }, 400);
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'Invalid email' }, 400);
  }

  const lead = { name, phone, email };

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
