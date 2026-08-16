import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const site = 'https://profitmedia.co.il';
const decodeHtml = (value) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
const normalizeSpace = (value) => value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const text = (html) =>
  normalizeSpace(decodeHtml(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')));
const firstTagText = (html, tag) => {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  assert.ok(match, `Missing <${tag}>`);
  return text(match[1]);
};
const jsonLdNodes = (html) =>
  [...html.matchAll(/<script\b[^>]*type=(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]))
    .flatMap((schema) => schema['@graph'] ?? [schema]);
const nodeOfType = (nodes, type, path) => {
  const node = nodes.find((candidate) => candidate['@type'] === type);
  assert.ok(node, `${path}: missing ${type} JSON-LD`);
  return node;
};
const assertVisible = (visible, value, label) => {
  assert.equal(typeof value, 'string', `${label}: expected schema string`);
  assert.ok(normalizeSpace(visible).includes(normalizeSpace(value)), `${label}: schema copy is not visible verbatim`);
};

const routePairs = [
  ['/', '/ru/'],
  ['/about', '/ru/about'],
  ['/blog', '/ru/blog'],
  ['/blog/shipur-yahas-hamara', '/ru/blog/povyshenie-konversii'],
  ['/blog/ekh-livkhor-sohnut-pirsum-digitali', '/ru/blog/kak-vybrat-digital-agentstvo'],
  ['/blog/kamah-oleh-sohnut-pirsum-digitali', '/ru/blog/skolko-stoit-digital-agentstvo'],
  ['/blog/hatzaat-mehir-ve-hozeh-sohnut', '/ru/blog/kommercheskoe-predlozhenie-i-dogovor'],
  ['/blog/daf-nechita-mul-daf-habayit', '/ru/blog/lending-ili-glavnaya'],
  ['/blog/kampeinim-memumanim-madrich', '/ru/blog/kontekstnaya-reklama'],
];
const outputPath = (path) => path === '/' ? 'dist/index.html' : `dist${path}/index.html`;
const pageDescriptors = routePairs.flatMap(([he, ru]) => [
  { locale: 'he-IL', path: he, file: outputPath(he) },
  { locale: 'ru', path: ru, file: outputPath(ru) },
]);

for (const page of pageDescriptors) {
  assert.ok(existsSync(resolve(root, page.file)), `Missing generated page ${page.file}`);
  const html = read(page.file);
  const visible = text(html);
  const nodes = jsonLdNodes(html);
  assert.ok(nodes.length > 0, `${page.file}: missing JSON-LD`);
  for (const node of nodes) {
    assert.equal(node.inLanguage, page.locale, `${page.file}: ${node['@type']} has wrong or missing inLanguage`);
  }

  if (page.locale === 'ru') {
    for (const node of nodes) {
      for (const key of ['name', 'description', 'headline']) {
        if (typeof node[key] === 'string') {
          assert.doesNotMatch(node[key], /[\u0590-\u05ff]/, `${page.file}: Hebrew ${key} leaked into Russian JSON-LD`);
        }
      }
    }
  }

  const h1 = firstTagText(html, 'h1');
  if (page.path === '/' || page.path === '/ru/') {
    const webPage = nodeOfType(nodes, 'WebPage', page.file);
    const service = nodeOfType(nodes, 'Service', page.file);
    assert.equal(normalizeSpace(webPage.name), h1, `${page.file}: WebPage name must equal visible H1`);
    assert.equal(normalizeSpace(service.name), h1, `${page.file}: Service name must equal visible H1`);
    assertVisible(visible, service.description, `${page.file}: Service description`);
    const organization = nodeOfType(nodes, 'ProfessionalService', page.file);
    assert.equal(organization.address?.addressCountry, 'IL', `${page.file}: Organization must remain in Israel`);
    assert.equal(organization.areaServed, undefined, `${page.file}: Organization must not claim remote office locations`);
    assert.deepEqual(organization.availableLanguage, ['he', 'ru'], `${page.file}: Organization languages changed`);
    assert.deepEqual(
      service.areaServed,
      page.locale === 'ru'
        ? { '@type': 'Place', name: 'Worldwide' }
        : { '@type': 'Country', name: 'Israel' },
      `${page.file}: Service areaServed is inaccurate`,
    );
    const faq = nodeOfType(nodes, 'FAQPage', page.file);
    for (const question of faq.mainEntity) {
      assertVisible(visible, question.name, `${page.file}: FAQ question`);
      assertVisible(visible, question.acceptedAnswer?.text, `${page.file}: FAQ answer`);
    }
  } else if (page.path.endsWith('/about')) {
    const about = nodeOfType(nodes, 'AboutPage', page.file);
    const person = nodeOfType(nodes, 'Person', page.file);
    assert.equal(normalizeSpace(about.name), h1, `${page.file}: AboutPage name must equal visible H1`);
    assertVisible(visible, about.description, `${page.file}: AboutPage description`);
    assertVisible(visible, person.name, `${page.file}: founder name`);
    assertVisible(visible, person.jobTitle, `${page.file}: founder role`);
    assertVisible(visible, person.description, `${page.file}: founder biography`);
  } else if (page.path === '/blog' || page.path === '/ru/blog') {
    const blog = nodeOfType(nodes, 'Blog', page.file);
    assert.equal(normalizeSpace(blog.name), h1, `${page.file}: Blog name must equal visible H1`);
    assertVisible(visible, blog.description, `${page.file}: Blog description`);
    for (const post of blog.blogPost) {
      assertVisible(visible, post.headline, `${page.file}: blog card title`);
    }
  } else {
    const posting = nodeOfType(nodes, 'BlogPosting', page.file);
    assert.equal(normalizeSpace(posting.headline), h1, `${page.file}: BlogPosting headline must equal visible H1`);
    const metaDescription = html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]*)"/i)?.[1];
    assert.equal(posting.description, decodeHtml(metaDescription ?? ''), `${page.file}: schema and meta descriptions differ`);
    const faq = nodeOfType(nodes, 'FAQPage', page.file);
    for (const question of faq.mainEntity) {
      assertVisible(visible, question.name, `${page.file}: article FAQ question`);
      assertVisible(visible, question.acceptedAnswer?.text, `${page.file}: article FAQ answer`);
    }
  }
}

const sitemapPath = resolve(root, 'dist/sitemap.xml');
assert.ok(existsSync(sitemapPath), 'Generated sitemap is missing');
execFileSync('xmllint', ['--noout', sitemapPath], { stdio: 'pipe' });
const sitemap = read('dist/sitemap.xml');
const urlBlocks = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
assert.equal(urlBlocks.length, 18, 'Sitemap must contain exactly 18 URL entries');
const actualUrls = urlBlocks.map((block) => decodeHtml(block.match(/<loc>(.*?)<\/loc>/)?.[1] ?? ''));
const expectedUrls = routePairs.flatMap(([he, ru]) => [`${site}${he}`, `${site}${ru}`]);
assert.deepEqual([...actualUrls].sort(), [...expectedUrls].sort(), 'Sitemap URL set is not exact');
assert.equal(new Set(actualUrls).size, 18, 'Sitemap contains duplicate URLs');

for (const [he, ru] of routePairs) {
  for (const path of [he, ru]) {
    const block = urlBlocks.find((candidate) => candidate.includes(`<loc>${site}${path}</loc>`));
    assert.ok(block, `Sitemap missing ${path}`);
    const alternates = Object.fromEntries(
      [...block.matchAll(/<xhtml:link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*\/>/g)]
        .map((match) => [match[1], decodeHtml(match[2])]),
    );
    assert.deepEqual(alternates, {
      'he-IL': `${site}${he}`,
      ru: `${site}${ru}`,
      'x-default': `${site}${he}`,
    }, `${path}: sitemap alternates are not exact and reciprocal`);
  }
}

const forbidden = [
  '/thank-you', '/prat', '/hatzara', '/404', '/ads', '/deals', '/avhun', '/lp/',
  '/donhin', '/adv_lp3', '/preview', '/ab-stats', '/ab-preview',
];
for (const fragment of forbidden) {
  assert.ok(!actualUrls.some((url) => url.includes(fragment)), `Sitemap contains forbidden route fragment ${fragment}`);
}
assert.ok(!existsSync(resolve(root, 'public/sitemap.xml')), 'Static public sitemap must be removed');
const sitemapSource = read('src/pages/sitemap.xml.ts');
assert.match(sitemapSource, /routePairs/, 'Sitemap must use the shared route source');
assert.match(sitemapSource, /getBlogPosts/, 'Sitemap must use the blog collection source');
assert.match(sitemapSource, /application\/xml;\s*charset=utf-8/, 'Sitemap response must declare XML content type');

const robots = read('public/robots.txt');
assert.ok(robots.includes(`Sitemap: ${site}/sitemap.xml`), 'robots.txt sitemap location changed');
for (const block of robots.split(/\n\s*\n/).filter((value) => {
  const agent = value.match(/^User-agent:\s*(.+)$/m)?.[1].trim();
  return agent && agent !== '*';
})) {
  assert.match(block, /^Disallow: \/ru\/prat$/m, 'Crawler group missing /ru/prat exclusion');
  assert.match(block, /^Disallow: \/ru\/hatzara$/m, 'Crawler group missing /ru/hatzara exclusion');
}

const llms = read('public/llms.txt');
assert.match(llms, /^## Русская версия$/m, 'llms.txt is missing its Russian section');
const russianSection = llms.split(/^## Русская версия$/m)[1]?.split(/^## /m)[0] ?? '';
const russianLinks = [...russianSection.matchAll(/\]\((https:\/\/profitmedia\.co\.il\/ru\/?[^)]*)\)/g)].map((match) => match[1]);
assert.deepEqual(
  russianLinks,
  routePairs.map(([, ru]) => `${site}${ru}`),
  'llms.txt Russian section must link exactly the nine indexable Russian pages',
);
assert.doesNotMatch(russianSection, /\bофис(?:а|ы|ов|ом|е)?\s+(?:в|на)\s+(?:России|Европе|США|СНГ)\b/i, 'llms.txt invents a non-Israeli office');

console.log('Task 8 checks passed: JSON-LD fidelity, exact 18-URL sitemap, reciprocal alternates, and crawler files.');
