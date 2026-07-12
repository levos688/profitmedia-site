const AUTH_COOKIE = 'ab_stats_auth';

export function getAbStatsToken(request: Request): string | null {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token')?.trim();
  if (queryToken) return queryToken;

  const header = request.headers.get('Cookie');
  if (!header) return null;

  const match = header.match(new RegExp(`(?:^|; )${AUTH_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function isAbStatsAuthorized(request: Request, expected?: string): boolean {
  if (!expected) return false;
  const token = getAbStatsToken(request);
  return Boolean(token && token === expected);
}

export function unauthorizedHtmlResponse(): Response {
  return new Response(
    '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive"><title>401</title></head><body><h1>Доступ запрещён</h1></body></html>',
    {
      status: 401,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
        'Cache-Control': 'no-store',
      },
    },
  );
}

export function withAbStatsSecurityHeaders(response: Response, setAuthCookie = false, token?: string): Response {
  const secured = new Response(response.body, response);
  secured.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  secured.headers.set('Cache-Control', 'private, no-store');

  if (setAuthCookie && token) {
    secured.headers.append(
      'Set-Cookie',
      `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`,
    );
  }

  return secured;
}
