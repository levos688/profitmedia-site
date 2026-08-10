import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const russianRange = /[\u0400-\u04ff]/;
const hebrewRange = /[\u0590-\u05ff]/;
const getTags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? [];
const getAttribute = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return match?.[1] ?? match?.[2];
};
const getJsonLdNodes = (html) =>
  [...html.matchAll(/<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]))
    .flatMap((schema) => schema['@graph'] ?? [schema]);
const assertSemanticCaveat = (source, phraseGroups, label) => {
  for (const [index, alternatives] of phraseGroups.entries()) {
    assert.ok(
      alternatives.some((pattern) => pattern.test(source)),
      `${label}: missing semantic phrase group ${index + 1}`,
    );
  }
};
const sortAlternates = (alternates) =>
  [...alternates].sort(([left], [right]) => left.localeCompare(right));

const pairs = [
  {
    key: 'conversion-improvement',
    he: 'shipur-yahas-hamara',
    ru: 'povyshenie-konversii',
    title: 'Как повысить конверсию: почему тестировать только объявления уже недостаточно',
    date: '2026-07-25',
    readingMinutes: 9,
    image: '/images/blog/shipur-yahas-hamara-square.png',
    imageWide: '/images/blog/shipur-yahas-hamara-wide.png',
    faqCount: 6,
    structure: { h2: 9, ul: 2, ol: 1, li: 16, table: 0, blockquote: 0 },
    required: ['15 секунд', '22 секунды', '25 секунд', '18 лет', '13 лет', '24 часов'],
  },
  {
    key: 'landing-vs-homepage',
    he: 'daf-nechita-mul-daf-habayit',
    ru: 'lending-ili-glavnaya',
    title: 'Лендинг или главная страница: куда вести трафик из рекламы',
    date: '2026-07-21',
    readingMinutes: 8,
    image: '/images/blog/daf-nechita-mul-daf-habayit-square.png',
    imageWide: '/images/blog/daf-nechita-mul-daf-habayit-wide.png',
    faqCount: 6,
    structure: { h2: 7, ul: 0, ol: 2, li: 8, table: 1, blockquote: 0 },
    required: ['поиска по названию компании', 'noindex', 'CPL', '24 часов'],
  },
  {
    key: 'paid-campaigns-guide',
    he: 'kampeinim-memumanim-madrich',
    ru: 'kontekstnaya-reklama',
    title: 'Платная реклама: сколько она стоит и как выбрать подходящий канал',
    date: '2026-07-16',
    readingMinutes: 7,
    image: '/images/blog/kampeinim-memumanim-square-v4.png',
    imageWide: '/images/blog/kampeinim-memumanim-wide-v3.png',
    faqCount: 8,
    structure: { h2: 6, ul: 4, ol: 0, li: 13, table: 0, blockquote: 1 },
    required: [
      'Facebook',
      'Instagram',
      'Google',
      'TikTok',
      'Meta',
      '200 000 ₪',
      '46%',
      'SKI VIP Travel',
      'Амит Шнайдер',
      'более 50',
      '41%',
    ],
  },
];

function parseFrontmatter(source, path) {
  const block = source.match(/^---\n([\s\S]*?)\n---/)?.[1];
  assert.ok(block, `${path}: missing frontmatter`);
  const value = (key) => {
    const match = block.match(new RegExp(`^${key}:\\s*(?:"([^"]*)"|([^\\n]+))$`, 'm'));
    assert.ok(match, `${path}: missing ${key}`);
    return (match[1] ?? match[2]).trim();
  };
  return {
    locale: value('locale'),
    translationKey: value('translationKey'),
    slug: value('slug'),
    title: value('title'),
    publishDate: value('publishDate'),
    body: source.slice(source.indexOf('\n---', 4) + 4),
  };
}

const descriptors = [];
for (const pair of pairs) {
  for (const [locale, slug] of [['he', pair.he], ['ru', pair.ru]]) {
    const path = `src/content/blog/${locale}/${slug}.md`;
    assert.ok(existsSync(resolve(root, path)), `Missing ${path}`);
    const source = read(path);
    const data = parseFrontmatter(source, path);
    assert.equal(data.locale, locale, `${path}: wrong locale`);
    assert.equal(data.translationKey, pair.key, `${path}: wrong translation key`);
    assert.equal(data.slug, slug, `${path}: wrong slug`);
    assert.match(source, new RegExp(`^readingMinutes: ${pair.readingMinutes}$`, 'm'), `${path}: reading time changed`);
    assert.ok(source.includes(`image: "${pair.image}"`), `${path}: square image path changed`);
    assert.ok(source.includes(`imageWide: "${pair.imageWide}"`), `${path}: wide image path changed`);
    assert.equal((source.match(/"question":/g) ?? []).length, pair.faqCount, `${path}: FAQ count changed`);
    descriptors.push(data);
  }

  const path = `src/content/blog/ru/${pair.ru}.md`;
  const source = read(path);
  const data = parseFrontmatter(source, path);
  assert.equal(data.title, pair.title, `${path}: editorial title changed`);
  assert.equal(data.publishDate, pair.date, `${path}: publication date changed`);
  assert.match(data.body, russianRange, `${path}: body is not Russian`);
  assert.doesNotMatch(data.body, hebrewRange, `${path}: unintended Hebrew in Russian body`);
  assert.doesNotMatch(data.body, /\bофис(?:а|ы|ов|ом|е)?\s+(?:в|на)\s+(?:России|Европе|США|СНГ)\b/i, `${path}: unsupported geographic office claim`);
  for (const fact of pair.required) {
    assert.ok(source.includes(fact), `${path}: missing preserved fact or caveat "${fact}"`);
  }
  for (const [tag, count] of Object.entries(pair.structure)) {
    const actual = (data.body.match(new RegExp(`<${tag}\\b`, 'gi')) ?? []).length;
    assert.equal(actual, count, `${path}: ${tag} structure differs from Hebrew source`);
  }
}

const conversionSource = read('src/content/blog/ru/povyshenie-konversii.md');
assert.match(conversionSource, /При достаточном объёме\s+трафика/, 'Conversion article must retain the sufficient-traffic requirement');
assert.match(conversionSource, /без кликов нечего измерять/, 'Conversion article must explain that tests require traffic');
assert.match(conversionSource, /Конкретный рост нельзя гарантировать заранее/, 'Conversion article must not guarantee a conversion gain');
assert.match(
  conversionSource,
  /внутренн[а-яё]*\s+тестов[а-яё]*\s+трафик[а-яё]*\s+отделяется\s+от\s+рекламн[а-яё]*[\s\S]{0,100}не\s+искажали\s+данные/i,
  'Conversion article must separate internal/test traffic from advertising traffic to protect analytics',
);
assert.doesNotMatch(conversionSource, /проигрывающ[а-яё]*\s+вариант/i, 'Conversion article must not invent losing-variant behavior');
assertSemanticCaveat(
  conversionSource,
  [
    [/рост\s+конверсии/i, /повышени[а-яё]*\s+конверсии/i],
    [/без\s+отбора/i, /без\s+квалификац/i, /без\s+фильтрац/i],
    [/слаб[а-яё]*\s+заяв/i, /некачествен[а-яё]*\s+(?:лид|обращ|заяв)/i, /нецелев[а-яё]*\s+(?:лид|обращ|заяв)/i],
  ],
  'Conversion versus lead-quality caveat',
);

const landingSource = read('src/content/blog/ru/lending-ili-glavnaya.md');
assert.match(landingSource, /без обещания гарантированных продаж/, 'Landing article must not guarantee sales');
assertSemanticCaveat(
  landingSource,
  [
    [/\bnoindex\b/i],
    [/временн[а-яё]*\s+страниц/i, /лендинг[а-яё]*\s+только\s+для\s+рекламы/i],
    [/часто\s+имеет\s+смысл/i, /можно\s+(?:задать|использовать|пометить)/i, /стоит\s+(?:задать|использовать|пометить)/i],
  ],
  'Conditional noindex caveat',
);

const paidSource = read('src/content/blog/ru/kontekstnaya-reklama.md');
assert.match(
  paidSource,
  /Поисковая и контекстная реклама в Google — лишь часть платного продвижения/,
  'Paid article must distinguish contextual/search advertising from broader paid advertising',
);
assert.doesNotMatch(
  paidSource,
  /(?:вся\s+)?платн[а-яё]*\s+реклам[а-яё]*\s*(?:—|–|-|это|является)\s*(?:только\s+)?контекстн[а-яё]*/i,
  'Paid article must not equate all paid advertising with contextual advertising',
);
assert.match(paidSource, /Название компании и подробные данные конфиденциальны/, 'Paid case must retain confidential identity/data caveat');
assert.match(paidSource, /клиент сообщал о продажах более чем на 200 000 ₪/, 'Sales figure must remain explicitly client-reported');
assertSemanticCaveat(
  paidSource,
  [
    [/израильск[а-яё]*\s+рынк/i],
    [/для\s+друг[а-яё]*\s+стран/i, /за\s+пределами\s+Израиля/i],
    [/пересчитыва/i, /адаптир/i, /уточня/i],
    [/аукцион/i, /ниш/i, /регион/i],
  ],
  'International budget recalculation caveat',
);
assertSemanticCaveat(
  paidSource,
  [
    [/конкретн[а-яё]*\s+сумм/i, /стоимост[а-яё]*\s+веден/i],
    [/не\s+спросив/i, /без\s+уч[её]та/i],
    [/отрасл/i],
    [/стоимост[а-яё]*\s+сделк/i],
    [/географ/i, /регион/i],
    [/аудитор/i],
    [/вряд\s+ли\s+будет\s+полез/i, /не\s+универсаль/i, /нерелевант/i],
  ],
  'No universal campaign price caveat',
);
assertSemanticCaveat(
  paidSource,
  [
    [/бюджет/i],
    [/данн/i, /информац/i],
    [/конкуренц/i, /отрасл/i, /стоимост[а-яё]*\s+(?:сделк|заказ)/i],
    [/зависит/i, /достаточ/i],
  ],
  'Budget and data-volume dependency caveat',
);
assert.match(
  paidSource,
  /(?:бюджет|медиабюджет)[\s\S]{0,240}(?:данн|информац)[\s\S]{0,240}(?:эффектив|понять|оценить)/i,
  'Budget caveat must connect available spend to sufficient data for the business',
);
assertSemanticCaveat(
  paidSource,
  [
    [/цикл[а-яё]*\s+продаж/i],
    [/срок/i, /врем/i],
    [/данн/i, /результат/i],
    [/зависит/i, /требуется/i, /нужно/i],
  ],
  'Sales-cycle timing caveat',
);
assert.match(
  paidSource,
  /(?:срок|врем)[\s\S]{0,120}зависит[\s\S]{0,180}цикл[а-яё]*\s+продаж[\s\S]{0,360}(?:данн|результат)/i,
  'Sales-cycle caveat must connect cycle duration to meaningful result timing',
);

assert.equal(new Set(descriptors.map(({ locale, slug }) => `${locale}:${slug}`)).size, 6, 'Blog locale/slug pairs must be unique');
assert.equal(
  new Set(descriptors.map(({ locale, translationKey }) => `${locale}:${translationKey}`)).size,
  6,
  'Each translation key must occur exactly once per locale',
);
for (const pair of pairs) {
  assert.deepEqual(
    descriptors.filter(({ translationKey }) => translationKey === pair.key).map(({ locale }) => locale).sort(),
    ['he', 'ru'],
    `${pair.key}: incomplete locale pair`,
  );
}

for (const path of ['src/pages/ru/blog/index.astro', 'src/pages/ru/blog/[slug].astro']) {
  assert.ok(existsSync(resolve(root, path)), `Missing ${path}`);
}
const preview = read('src/components/BlogPreview.astro');
assert.match(preview, /getLocalizedPath\(\s*'blog',\s*locale\s*\)/, 'BlogPreview must derive its locale-specific index URL');
const russianHome = read('src/pages/ru/index.astro');
assert.match(russianHome, /<BlogPreview[^>]*locale=\{locale\}/s, 'Russian homepage must load Russian blog cards');
assert.doesNotMatch(russianHome, /posts=\{\[\]\}/, 'Russian homepage must not suppress translated posts');

if (process.argv.includes('--generated')) {
  const expectedAlternates = (pair) => [
    ['he-IL', `https://profitmedia.co.il/blog/${pair.he}`],
    ['ru', `https://profitmedia.co.il/ru/blog/${pair.ru}`],
    ['x-default', `https://profitmedia.co.il/blog/${pair.he}`],
  ];
  const pages = [
    {
      path: 'dist/blog/index.html',
      canonical: 'https://profitmedia.co.il/blog',
      alternates: [
        ['he-IL', 'https://profitmedia.co.il/blog'],
        ['ru', 'https://profitmedia.co.il/ru/blog'],
        ['x-default', 'https://profitmedia.co.il/blog'],
      ],
    },
    {
      path: 'dist/ru/blog/index.html',
      canonical: 'https://profitmedia.co.il/ru/blog',
      alternates: [
        ['he-IL', 'https://profitmedia.co.il/blog'],
        ['ru', 'https://profitmedia.co.il/ru/blog'],
        ['x-default', 'https://profitmedia.co.il/blog'],
      ],
    },
    ...pairs.flatMap((pair) => [
      {
        path: `dist/blog/${pair.he}/index.html`,
        canonical: `https://profitmedia.co.il/blog/${pair.he}`,
        alternates: expectedAlternates(pair),
      },
      {
        path: `dist/ru/blog/${pair.ru}/index.html`,
        canonical: `https://profitmedia.co.il/ru/blog/${pair.ru}`,
        alternates: expectedAlternates(pair),
      },
    ]),
  ];

  for (const page of pages) {
    assert.ok(existsSync(resolve(root, page.path)), `Missing generated URL for ${page.path}`);
    const html = read(page.path);
    const linkTags = getTags(html, 'link');
    const canonicals = linkTags
      .filter((tag) => getAttribute(tag, 'rel') === 'canonical')
      .map((tag) => getAttribute(tag, 'href'));
    assert.deepEqual(canonicals, [page.canonical], `${page.path}: canonical must be exact and unique`);
    const alternates = linkTags
      .filter((tag) => getAttribute(tag, 'rel') === 'alternate' && getAttribute(tag, 'hreflang'))
      .map((tag) => [getAttribute(tag, 'hreflang'), getAttribute(tag, 'href')]);
    assert.deepEqual(
      sortAlternates(alternates),
      sortAlternates(page.alternates),
      `${page.path}: hreflang set must be exact and reciprocal`,
    );
  }

  const russianOutputs = [
    'dist/ru/blog/index.html',
    ...pairs.map(({ ru }) => `dist/ru/blog/${ru}/index.html`),
  ];
  for (const path of russianOutputs) {
    const html = read(path);
    const htmlTag = getTags(html, 'html')[0];
    assert.equal(getAttribute(htmlTag, 'lang'), 'ru', `${path}: wrong locale`);
    assert.equal(getAttribute(htmlTag, 'dir'), 'ltr', `${path}: wrong direction`);

    const localizedLeadElements = [
      ...getTags(html, 'form'),
      ...getTags(html, 'div'),
    ].filter((tag) => getAttribute(tag, 'data-locale') !== undefined);
    assert.ok(localizedLeadElements.length > 0, `${path}: missing localized form root`);
    for (const tag of localizedLeadElements) {
      assert.equal(getAttribute(tag, 'data-locale'), 'ru', `${path}: form must submit Russian locale`);
      assert.equal(getAttribute(tag, 'data-thank-you'), '/ru/thank-you', `${path}: form must use Russian thank-you route`);
    }

    const switchers = [
      ...html.matchAll(/<nav\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\blanguage-switcher\b[^"]*"|'[^']*\blanguage-switcher\b[^']*'))[^>]*>[\s\S]*?<\/nav>/gi),
    ].map((match) => match[0]);
    assert.equal(switchers.length, 3, `${path}: expected desktop, mobile, and footer language switchers`);
    for (const switcher of switchers) {
      assert.equal((switcher.match(/עברית/g) ?? []).length, 1, `${path}: each language switcher must contain one Hebrew label`);
      assert.doesNotMatch(switcher.replace('עברית', ''), hebrewRange, `${path}: unexpected Hebrew inside language switcher`);
    }
    let outsideSwitchers = html;
    for (const switcher of switchers) outsideSwitchers = outsideSwitchers.replace(switcher, '');
    assert.doesNotMatch(outsideSwitchers, hebrewRange, `${path}: unintended Hebrew outside language switchers`);
  }

  const russianIndex = read('dist/ru/blog/index.html');
  const russianHomeHtml = read('dist/ru/index.html');
  for (const { ru } of pairs) {
    const expectedHref = `/ru/blog/${ru}`;
    const indexHrefs = getTags(russianIndex, 'a').map((tag) => getAttribute(tag, 'href'));
    const homeHrefs = getTags(russianHomeHtml, 'a').map((tag) => getAttribute(tag, 'href'));
    assert.ok(indexHrefs.includes(expectedHref), `Russian index missing ${ru} card`);
    assert.ok(homeHrefs.includes(expectedHref), `Russian homepage missing ${ru} card`);
    const articleHtml = read(`dist/ru/blog/${ru}/index.html`);
    const posting = getJsonLdNodes(articleHtml).find((node) => node['@type'] === 'BlogPosting');
    assert.equal(posting?.author?.url, 'https://profitmedia.co.il/ru/about#founder', `${ru}: article author schema must use the Russian about URL`);
  }
}

console.log('Task 7 checks passed: six URLs, unique pairs, exact SEO alternates, Russian links, locale-safe forms, and editorial invariants.');
