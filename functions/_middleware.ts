import {
  getAbStatsToken,
  isAbStatsAuthorized,
  unauthorizedHtmlResponse,
  withAbStatsSecurityHeaders,
} from './lib/ab-stats-auth';

interface Env {
  AB_STATS_TOKEN?: string;
}

export async function onRequest(context: { request: Request; env: Env; next: () => Promise<Response> }) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';

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
