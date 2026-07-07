import type { LeadData, UtmParams } from './contact-types';

export function buildDonhinLeadText(lead: LeadData): string {
  const lines: string[] = [];

  lines.push('Name', lead.name, '');
  lines.push('Phone', lead.phone, '');

  if (lead.quizAnswer) {
    lines.push(
      'Оказывалась ли вам медицинская или стоматологическая помощь в последние 7 лет?',
      lead.quizAnswer.toLowerCase(),
      '',
    );
  }

  lines.push('Date', lead.submittedAt.toISOString(), '');

  const tracking = lead.tracking || {};
  const orderedKeys = [
    'fbclid',
    'fbc',
    'fbp',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'utm_medium',
    'utm_source',
    'gclid',
    'ad_id',
    'adset_id',
    'campaign_id',
    'lead_id',
  ];

  const used = new Set<string>();
  for (const key of orderedKeys) {
    const value = tracking[key];
    if (value) {
      lines.push(value);
      used.add(key);
    }
  }

  for (const [key, value] of Object.entries(tracking)) {
    if (!used.has(key) && value) lines.push(value);
  }

  if (lead.language) {
    lines.push('', lead.language);
  }

  return lines.join('\n').trim();
}

export function getDonhinRecipients(env: {
  CONTACT_EMAIL?: string;
  DONHIN_EMAIL?: string;
  DONHIN_TEST_EMAIL?: string;
}): string[] {
  // Temporary: set DONHIN_TEST_EMAIL in Cloudflare to route all Donhin leads to one inbox while testing.
  if (env.DONHIN_TEST_EMAIL) return [env.DONHIN_TEST_EMAIL];

  const primary = env.CONTACT_EMAIL || 'lev@profitmedia.co.il';
  const lawyer = env.DONHIN_EMAIL || 'simon@donhin.co.il';
  return [...new Set([primary, lawyer])];
}

export type { LeadData, UtmParams };
