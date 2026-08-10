import type { Locale } from './config';
import { assertContentCompleteness } from './completeness';
import { about as heAbout } from './he/about';
import { home as heHome } from './he/home';
import { ui as heUi } from './he/ui';
import { about as ruAbout } from './ru/about';
import { home as ruHome } from './ru/home';
import { ui as ruUi } from './ru/ui';

assertContentCompleteness(heUi, ruUi, 'ui');
assertContentCompleteness(heHome, ruHome, 'home');
assertContentCompleteness(heAbout, ruAbout, 'about');

const content = {
  he: { ui: heUi, home: heHome, about: heAbout },
  ru: { ui: ruUi, home: ruHome, about: ruAbout },
} as const;

export const getContent = (locale: Locale) => content[locale];
export const getUi = (locale: Locale) => content[locale].ui;
export const getHomeContent = (locale: Locale) => content[locale].home;
export const getAboutContent = (locale: Locale) => content[locale].about;
