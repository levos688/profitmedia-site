import {
  getAbStatsToken,
  isAbStatsAuthorized,
  unauthorizedHtmlResponse,
  withAbStatsSecurityHeaders,
} from './lib/ab-stats-auth';

interface Env {
  AB_STATS_TOKEN?: string;
}

const GOOGLE_SITE_VERIFICATION =
  'google-site-verification: googleae2d1f2277e31c67.html\n';

export async function onRequest(context: { request: Request; env: Env; next: () => Promise<Response> }) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';

  // Cloudflare Pretty URLs 308-redirects *.html → extensionless, which breaks
  // Google Search Console HTML-file verification. Serve the exact payload on both paths.
  if (
    path === '/googleae2d1f2277e31c67.html' ||
    path === '/googleae2d1f2277e31c67'
  ) {
    return new Response(GOOGLE_SITE_VERIFICATION, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Robots-Tag': 'noindex',
      },
    });
  }

  if (path !== '/donhin/ab-stats') {
    return next();
  }

  if (!env.AB_STATS_TOKEN) {
    return new Response('Stats access is not configured', { status: 503 });
  }

  const urlToken = getAbStatsToken(request);
  const authorized = isAbStatsAuthorized(request, env.AB_STATS_TOKEN);

  if (!authorized) {
    return unauthorizedHtmlResponse();
  }

  const response = await next();
  const setCookie = Boolean(url.searchParams.get('token')?.trim() && urlToken === env.AB_STATS_TOKEN);
  return withAbStatsSecurityHeaders(response, setCookie, env.AB_STATS_TOKEN);
}
