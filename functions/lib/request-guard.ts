const BLOCKED_UA_RE =
  /\b(curl|wget|python-requests|python-urllib|aiohttp|httpx|go-http-client|axios|node-fetch|undici|httpie|postman|insomnia|libwww-perl|okhttp|java\/)\b/i;

export function isAllowedOrigin(originHeader: string | null): boolean {
  if (!originHeader) return false;
  try {
    const url = new URL(originHeader);
    const host = url.hostname.toLowerCase();
    if (
      host === 'profitmedia.co.il' ||
      host === 'www.profitmedia.co.il' ||
      host === 'profitmedia-site.pages.dev' ||
      host.endsWith('.profitmedia-site.pages.dev')
    ) {
      return url.protocol === 'https:';
    }
    if (host === 'localhost' || host === '127.0.0.1') {
      return url.protocol === 'http:' || url.protocol === 'https:';
    }
    return false;
  } catch {
    return false;
  }
}

export function isBlockedUserAgent(ua: string | null): boolean {
  const trimmed = (ua || '').trim();
  if (!trimmed) return true;
  return BLOCKED_UA_RE.test(trimmed);
}

/** Reject direct CLI/script POSTs and cross-site requests to public endpoints. */
export function guardPublicPost(request: Request): Response | null {
  const origin = request.headers.get('Origin');
  const secFetchSite = request.headers.get('Sec-Fetch-Site');
  if (!isAllowedOrigin(origin) || secFetchSite === 'cross-site' || isBlockedUserAgent(request.headers.get('User-Agent'))) {
    return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
  return null;
}
