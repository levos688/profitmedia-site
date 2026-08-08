import type { AbAllocation } from './ab-stats-core';
import { AB_EXPERIMENTS } from './ab-stats-core';

export type SoloNotifyEnv = {
  DONHIN_AB_STATS: KVNamespace;
  RESEND_API_KEY?: string;
  FROM_EMAIL?: string;
};

const SOLO_NOTIFY_TO = 'lev@profitmedia.co.il';

const EXPERIMENT_TITLES: Record<string, string> = {
  sticky_cta: 'Кнопка внизу экрана',
  popup_delay: 'Таймер popup',
  popup_scroll: 'Скролл popup',
  quiz_copy: 'Квиз (текст/дизайн)',
  bottom_copy: 'Нижняя форма',
  hero_media: 'Hero фото/видео',
};

function dedupeKey(channel: string, experiment: string, leader: string): string {
  return `ab:notify:solo:${channel}:${experiment}:${leader}`;
}

async function sendSoloEmail(
  env: SoloNotifyEnv,
  experiment: string,
  alloc: AbAllocation,
  channel: string,
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey || !alloc.leader) return;

  const title = EXPERIMENT_TITLES[experiment] || experiment;
  const loser =
    Object.keys(alloc.weights).find((id) => id !== alloc.leader && alloc.weights[id] === 0) ||
    Object.keys(alloc.weights).find((id) => id !== alloc.leader) ||
    '—';

  const text = [
    `Поздравляем! Есть выигрышный вариант в A/B «${title}».`,
    '',
    `Канал: ${channel}`,
    `Эксперимент: ${experiment}`,
    `Победитель: ${alloc.leader}`,
    `Выключен: ${loser}`,
    `Режим: solo (100% трафика на победителя)`,
    '',
    alloc.reason,
    '',
    'Сейчас работает только один вариант.',
    'Предложи новый challenger — и можно запускать следующий тест.',
    '',
    'Дашборд: https://profitmedia.co.il/donhin/ab-stats/?token=profitmedia-ab-stats&channel=fb_ads&preset=all_time',
  ].join('\n');

  const from = env.FROM_EMAIL || 'Profit Media <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [SOLO_NOTIFY_TO],
      subject: `Победа в A/B: ${title} → ${alloc.leader}`,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Solo notify email failed: ${err}`);
  }
}

/**
 * Email Lev once per experiment+leader when allocation first enters solo.
 * Failures are logged; callers should not fail the HTTP response.
 */
export async function maybeNotifySoloWins(
  env: SoloNotifyEnv,
  allocation: Record<string, AbAllocation>,
  channel = 'fb_ads',
): Promise<void> {
  if (!env.DONHIN_AB_STATS || !env.RESEND_API_KEY) return;

  for (const [experiment, alloc] of Object.entries(allocation)) {
    if (alloc.mode !== 'solo' || !alloc.leader) continue;
    if (!(experiment in AB_EXPERIMENTS) && !(experiment in EXPERIMENT_TITLES)) continue;

    const key = dedupeKey(channel, experiment, alloc.leader);
    try {
      const existing = await env.DONHIN_AB_STATS.get(key);
      if (existing) continue;

      await sendSoloEmail(env, experiment, alloc, channel);
      await env.DONHIN_AB_STATS.put(key, new Date().toISOString());
    } catch (err) {
      console.error('solo notify failed', experiment, err);
    }
  }
}
