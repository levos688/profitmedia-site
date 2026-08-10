import type { Locale } from './config';

export const routePairs = {
  home: { he: '/', ru: '/ru/' },
  about: { he: '/about', ru: '/ru/about' },
  blog: { he: '/blog', ru: '/ru/blog' },
  conversionArticle: {
    he: '/blog/shipur-yahas-hamara',
    ru: '/ru/blog/povyshenie-konversii',
  },
  landingArticle: {
    he: '/blog/daf-nechita-mul-daf-habayit',
    ru: '/ru/blog/lending-ili-glavnaya',
  },
  paidCampaignsArticle: {
    he: '/blog/kampeinim-memumanim-madrich',
    ru: '/ru/blog/kontekstnaya-reklama',
  },
  thankYou: { he: '/thank-you', ru: '/ru/thank-you' },
  privacy: { he: '/prat', ru: '/ru/prat' },
  accessibility: { he: '/hatzara', ru: '/ru/hatzara' },
  notFound: { he: '/404', ru: '/ru/404' },
} as const;

export type RouteId = keyof typeof routePairs;

export function getLocalizedPath(routeId: RouteId, locale: Locale): string {
  return routePairs[routeId][locale];
}

export function findRouteId(pathname: string): RouteId | undefined {
  const normalized = pathname !== '/' ? pathname.replace(/\/$/, '') : '/';
  return (Object.keys(routePairs) as RouteId[]).find((id) =>
    Object.values(routePairs[id]).some((path) =>
      (path !== '/' ? path.replace(/\/$/, '') : '/') === normalized
    )
  );
}
