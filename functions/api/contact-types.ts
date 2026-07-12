export interface Env {
  RESEND_API_KEY?: string;
  CONTACT_EMAIL?: string;
  DONHIN_EMAIL?: string;
  DONHIN_TEST_EMAIL?: string;
  FROM_EMAIL?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  META_CAPI_ACCESS_TOKEN?: string;
}

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  [key: string]: string | undefined;
}

export interface ContactPayload {
  name?: string;
  phone?: string;
  email?: string;
  pageUrl?: string;
  landingUrl?: string;
  referrer?: string;
  utm?: UtmParams;
  tracking?: Record<string, string>;
  language?: string;
  client?: string;
  quizAnswer?: string;
  formType?: string;
  eventId?: string;
}

export interface LeadData extends Required<Pick<ContactPayload, 'name' | 'phone'>> {
  email: string;
  pageUrl: string;
  landingUrl: string;
  referrer: string;
  utm: UtmParams;
  tracking: Record<string, string>;
  language: string;
  client: string;
  quizAnswer: string;
  formType: string;
  ip: string;
  country: string;
  userAgent: string;
  refererHeader: string;
  submittedAt: Date;
}
