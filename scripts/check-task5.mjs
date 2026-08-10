import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const read = (path) => readFile(join(root, path), 'utf8');

const localeDrivenFormFiles = {
  'src/components/preview/PreviewContactForm.astro': {
    submitDefault: /submit:\s*homeCta/,
    redirectContext: /pageRoot\?\.dataset\.thankYou/,
  },
  'src/components/preview/LeadCaptureModal.astro': {
    submitDefault: /submit:\s*modalConfig\.submit/,
    redirectContext: /pageRoot\?\.dataset\.thankYou/,
  },
};

for (const [path, expectations] of Object.entries(localeDrivenFormFiles)) {
  const source = await read(path);
  assert.match(source, /locale\?:\s*Locale/, `${path} keeps a backward-compatible locale prop`);
  assert.match(source, /strings\?:\s*UiStrings\['form'\]/, `${path} keeps backward-compatible localized strings`);
  assert.match(source, /thankYouUrl\?:\s*string/, `${path} keeps a backward-compatible redirect override`);
  assert.match(source, expectations.submitDefault, `${path} keeps its component-specific legacy submit`);
  assert.match(source, expectations.redirectContext, `${path} keeps its legacy page redirect context`);
  const payload = source.match(/const payload = \{([\s\S]*?)\n\s*\};/)?.[1] || '';
  assert.match(payload, /language:\s*navigator\.language/, `${path} JSON payload sends browser language`);
  assert.match(payload, /locale:\s*(?:form|modal).*dataset\.locale/, `${path} JSON payload sends site locale`);
  assert.match(payload, /utm:\s*attr\.utm/, `${path} JSON payload preserves UTM attribution`);
  assert.match(payload, /landingUrl:\s*attr\.landingUrl/, `${path} JSON payload preserves first-touch landing attribution`);
  assert.match(source, /window\.location\.href = thankYou/, `${path} redirects from the resolved page context`);
}

const homePopup = await read('src/components/preview/HomeAbPopup.astro');
assert.match(homePopup, /Hebrew-only/, 'Home popup documents its Hebrew-only release scope');
assert.match(homePopup, /locale\?:\s*Locale/, 'Home popup locale payload override is backward compatible');
assert.match(homePopup, /formStrings\?:\s*UiStrings\['form'\]/, 'Home popup form string override is backward compatible');
assert.match(homePopup, /const submitLabel = formStrings\?\.submit \?\? 'המשך'/, 'Home popup keeps the original initial submit label');
assert.equal((homePopup.match(/text-align:\s*right/g) || []).length, 4, 'Home popup keeps all four original RTL alignments');
assert.match(
  homePopup,
  /setErr\('pm-home-popup-name',\s*popup\?\.dataset\.nameError\s*\|\|\s*'נא להזין שם'/,
  'Home popup keeps its original validation copy',
);
assert.match(homePopup, /popup\?\.dataset\.sending\s*\|\|\s*'שולח…'/, 'Home popup keeps its original sending copy');
assert.match(
  homePopup,
  /popup\?\.dataset\.genericError\s*\|\|\s*'שגיאה בשליחה\. נסו שוב או כתבו ל-info@profitmedia\.co\.il'/,
  'Home popup keeps its original error copy',
);
assert.match(homePopup, /locale:\s*popup\?\.dataset\.locale\s*\|\|\s*'he'/, 'Home popup JSON payload sends site locale');
assert.match(homePopup, /language:\s*navigator\.language/, 'Home popup JSON payload sends browser language');
assert.match(homePopup, /const thankYou =[\s\S]*pageRoot\?\.dataset\.thankYou/, 'Home popup preserves legacy page redirect context');
assert.match(homePopup, /window\.location\.href = thankYou/, 'Home popup redirects through the legacy page context');

const homePage = await read('src/pages/index.astro');
assert.match(homePage, /<HomeAbPopup locale=\{locale\} \/>/, 'Hebrew homepage explicitly supplies locale only');
for (const path of [
  'src/pages/ads/index.astro',
  'src/pages/ads/ab-preview.astro',
  'src/pages/home/ab-preview.astro',
]) {
  const source = await read(path);
  assert.match(source, /<HomeAbPopup \/>/, `${path} keeps legacy popup defaults`);
}

for (const path of [
  'src/pages/index.astro',
  'src/pages/about.astro',
  'src/pages/ads/index.astro',
  'src/pages/ads/ab-preview.astro',
  'src/pages/home/ab-preview.astro',
  'src/pages/preview.astro',
  'src/pages/deals/index.astro',
  'src/pages/deals/system/index.astro',
  'src/pages/lp/[keyword].astro',
]) {
  const source = await read(path);
  assert.doesNotMatch(source, /<(?:PreviewContactForm|LeadCaptureModal)[^>]+(?:strings|locale|thankYouUrl)=/, `${path} uses legacy form defaults`);
}

const layout = await read('src/layouts/Layout.astro');
assert.match(layout, /emitAlternates\?:\s*boolean/, 'Layout exposes an alternate-emission policy');
assert.match(layout, /emitAlternates\s*=\s*!noindex/, 'Layout suppresses alternates by default for noindex pages');
assert.match(layout, /emitAlternates\s*\?\s*\(/, 'Layout applies alternate-emission policy');

const contactTypes = await read('functions/api/contact-types.ts');
assert.match(contactTypes, /locale\?:\s*'he'\s*\|\s*'ru'/, 'contact payload accepts the site locale');
assert.match(contactTypes, /locale:\s*'he'\s*\|\s*'ru'\s*\|\s*''/, 'normalized leads retain the site locale');

const contact = await read('functions/api/contact.ts');
assert.match(contact, /Locale:\s*['"`+]/, 'lead diagnostics include locale');
assert.match(contact, /locale:.*body\.locale/, 'API normalizes locale');
assert.match(contact, /locale[:_].*lead\.locale/s, 'CRM diagnostics include locale');

const russianPages = [
  'src/pages/ru/thank-you.astro',
  'src/pages/ru/404.astro',
  'src/pages/ru/prat.astro',
  'src/pages/ru/hatzara.astro',
];

for (const path of russianPages) {
  const source = (await read(path)).replaceAll('עברית', '');
  assert.match(source, /locale=["{]?(?:'ru'|locale|ru)/, `${path} renders with the Russian locale`);
  assert.match(source, /\bnoindex\b/, `${path} stays out of search indexes`);
  assert.doesNotMatch(source, /[\u0590-\u05ff]/, `${path} contains no unintended Hebrew`);
}

const legalDocument = await read('src/components/LegalDocument.astro');
assert.match(legalDocument, /padding-inline-start/, 'legal lists use logical LTR/RTL spacing');
assert.doesNotMatch(legalDocument, /padding-right/, 'legal lists do not force RTL spacing');

if (process.argv.includes('--generated')) {
  const generatedForms = [
    ['dist/index.html', 'he', '/thank-you'],
    ['dist/ru/index.html', 'ru', '/ru/thank-you'],
  ];
  for (const [path, locale, thankYou] of generatedForms) {
    const html = await read(path);
    assert.match(html, new RegExp(`data-locale=\"${locale}\"`), `${path} carries the site locale`);
    assert.match(html, new RegExp(`data-thank-you=\"${thankYou.replaceAll('/', '\\/')}\"`), `${path} carries the locale redirect`);
    assert.match(html, /navigator\.language/, `${path} sends browser language`);
    assert.match(html, /\/api\/contact/, `${path} retains API routing`);
  }

  const legacyFormPages = [
    'dist/index.html',
    'dist/ads/index.html',
    'dist/blog/shipur-yahas-hamara/index.html',
  ];
  for (const path of legacyFormPages) {
    const html = await read(path);
    const previewForm = html.slice(
      html.indexOf('id="preview-contact-form"'),
      html.indexOf('</form>', html.indexOf('id="preview-contact-form"')) + '</form>'.length,
    );
    const leadModal = html.slice(
      html.indexOf('id="lead-modal"'),
      html.indexOf('</form>', html.indexOf('id="lead-modal"')) + '</form>'.length,
    );
    assert.match(previewForm, /data-submit-label="קבלו אבחון קמפיין חינם"/, `${path} keeps PreviewContactForm submit`);
    assert.match(previewForm, /data-name-error="נא להזין שם מלא"/, `${path} keeps PreviewContactForm errors`);
    const expectedModalSubmit = path.startsWith('dist/blog/')
      ? /data-submit-label="כן, אני רוצה אבחון חינם"/
      : /data-submit-label="כן, שלחו לי אבחון חינם"/;
    assert.match(leadModal, expectedModalSubmit, `${path} keeps LeadCaptureModal submit`);
    assert.match(leadModal, /data-name-error="נא להזין שם מלא"/, `${path} keeps LeadCaptureModal errors`);
  }

  const russianHtml = await read('dist/ru/index.html');
  const russianPreview = russianHtml.slice(
    russianHtml.indexOf('id="preview-contact-form"'),
    russianHtml.indexOf('</form>', russianHtml.indexOf('id="preview-contact-form"')) + '</form>'.length,
  );
  const russianModal = russianHtml.slice(
    russianHtml.indexOf('id="lead-modal"'),
    russianHtml.indexOf('</form>', russianHtml.indexOf('id="lead-modal"')) + '</form>'.length,
  );
  assert.match(russianPreview, /data-locale="ru"/, 'Russian PreviewContactForm sends Russian locale');
  assert.match(russianPreview, /data-thank-you="\/ru\/thank-you"/, 'Russian PreviewContactForm keeps Russian redirect');
  assert.match(russianPreview, /data-submit-label="Получить бесплатную диагностику рекламы"/, 'Russian PreviewContactForm keeps Russian submit');
  assert.match(russianModal, /data-locale="ru"/, 'Russian LeadCaptureModal sends Russian locale');
  assert.match(russianModal, /data-thank-you="\/ru\/thank-you"/, 'Russian LeadCaptureModal keeps Russian redirect');
  assert.match(russianModal, /data-submit-label="Получить бесплатную диагностику"/, 'Russian LeadCaptureModal keeps Russian submit');

  const paidPopupHtml = await read('dist/ads/index.html');
  const popupStart = paidPopupHtml.indexOf('id="pm-home-popup"');
  const popupEnd = paidPopupHtml.indexOf('</form>', popupStart) + '</form>'.length;
  const paidPopupMarkup = paidPopupHtml.slice(popupStart, popupEnd);
  assert.ok(popupStart >= 0 && popupEnd > popupStart, 'paid popup markup is generated');
  assert.match(paidPopupMarkup, /id="pm-home-popup-submit"[^>]*>המשך<\/button>/, 'paid popup keeps initial submit copy');
  assert.match(paidPopupMarkup, /for="pm-home-popup-name"[^>]*>שם מלא<\/label>/, 'paid popup keeps name copy');
  assert.doesNotMatch(paidPopupMarkup, /placeholder=/, 'paid popup keeps legacy inputs without placeholders');

  for (const page of ['thank-you', '404', 'prat', 'hatzara']) {
    const path = `dist/ru/${page}/index.html`;
    const html = await read(path);
    assert.doesNotMatch(html, /<link rel="alternate" hreflang=/, `${path} emits no SEO language alternates`);
    assert.match(
      html,
      new RegExp(`<link rel=\"canonical\" href=\"https://profitmedia\\.co\\.il/ru/${page}/?\">`),
      `${path} keeps a self-referencing canonical`,
    );
  }
}

console.log('Task 5 focused checks passed.');
