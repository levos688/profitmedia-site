import { localeMeta, type Locale } from './config';
import { routePairs, type RouteId } from './routes';

export const SITE_ORIGIN = 'https://profitmedia.co.il';

export const absoluteUrl = (path: string) => new URL(path, SITE_ORIGIN).href;

export function getRouteAlternates(routeId: RouteId) {
  return [
    { hreflang: localeMeta.he.hreflang, href: absoluteUrl(routePairs[routeId].he) },
    { hreflang: localeMeta.ru.hreflang, href: absoluteUrl(routePairs[routeId].ru) },
    { hreflang: 'x-default', href: absoluteUrl(routePairs[routeId].he) },
  ];
}

export function getOgLocale(locale: Locale) {
  return localeMeta[locale].ogLocale;
}
