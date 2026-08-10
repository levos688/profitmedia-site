import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const fromRoot = (path) => readFileSync(resolve(root, path), 'utf8');

const decodeHtml = (value) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

const textContent = (value) =>
  decodeHtml(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();

function normalizeDomSignature(html) {
  return (html.match(/<!--[\s\S]*?-->|<\/?[^>]+>|[^<]+/g) ?? [])
    .map((token) => {
      if (token.startsWith('<!--')) return '';
      if (!token.startsWith('<')) return textContent(token);
      if (/^<\//.test(token)) {
        const tagName = token.match(/^<\/\s*([^\s>]+)/)?.[1]?.toLowerCase();
        return tagName ? `</${tagName}>` : '';
      }

      const tagName = token.match(/^<\s*([^\s/>]+)/)?.[1]?.toLowerCase();
      if (!tagName) return '';
      const attributes = [];
      const attributeSource = token
        .replace(/^<\s*[^\s/>]+/, '')
        .replace(/\/?>\s*$/, '');
      for (const match of attributeSource.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
        const name = match[1].toLowerCase();
        if (name.startsWith('data-astro-cid-')) continue;
        let value = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
        if (name === 'class') value = value.replace(/\s+/g, ' ').trim();
        attributes.push([name, value]);
      }
      attributes.sort(([left], [right]) => left.localeCompare(right));
      const serialized = attributes
        .map(([name, value]) => (value === '' ? name : `${name}=${JSON.stringify(value)}`))
        .join(' ');
      return `<${tagName}${serialized ? ` ${serialized}` : ''}>`;
    })
    .filter(Boolean)
    .join('');
}

const domSignatureHash = (html) =>
  createHash('sha256').update(normalizeDomSignature(html)).digest('hex');

const getAttribute = (tag, name, label) => {
  const value = tag.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))?.[1];
  assert.notEqual(value, undefined, `Missing ${label} ${name}`);
  return decodeHtml(value);
};

const getMeta = (html, attribute, value, label) => {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) => getOptionalAttribute(candidate, attribute) === value);
  assert.ok(tag, `Missing ${label}`);
  return getAttribute(tag, 'content', label);
};

const getOptionalAttribute = (tag, name) =>
  tag.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))?.[1];

const getElementTexts = (html, tag) =>
  [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi'))].map((match) =>
    textContent(match[1]),
  );

const getJsonLdNodes = (html) =>
  [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((entry) => JSON.parse(decodeHtml(entry[1])))
    .flatMap((schema) => schema['@graph'] ?? [schema]);

function assertCssRule(source, selector, declarations) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const body = source.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`))?.[1];
  assert.ok(body, `Missing CSS rule ${selector}`);
  const normalized = body.replace(/\s+/g, ' ').trim();
  for (const declaration of declarations) {
    assert.ok(normalized.includes(declaration), `${selector}: missing CSS declaration ${declaration}`);
  }
}

const faqs = {
  conversion: [
    ['מה זה שיפור יחס המרה בפועל?', 'להגדיל את האחוז מהמבקרים שמבצעים פעולה רצויה — השארת פרטים, מענה לשאלון, פנייה — בלי בהכרח להגדיל את תקציב המדיה.'],
    ['האם A/B על מודעות מספיק?', 'זה חלק חשוב, אבל לא מספיק. אם הדף לא נבדק, חלק גדול מהשיפור נשאר על השולחן.'],
    ['כמה זמן לוקח לראות תוצאה?', 'תלוי בנפח. בודקים לפי המרות ונפח מינימלי לכל גרסה — לא לפי תחושה אחרי 48 שעות.'],
    ['האם אני כלקוח צריך לנהל את הבדיקות?', 'לא. הרעיון הוא שתקבלו מערכת מוכנה; הניהול השוטף של הניסויים קורה מאחורי הקלעים.'],
    ['מה בודקים קודם — כותרת או פופאפ?', 'בדרך כלל מתחילים במה שקרוב למסר ולפעולה הראשית (כותרת / CTA), ואז יורדים לטריגרים ולשכבות משניות. הסדר תלוי בדף ובתנועה.'],
    ['איך זה מתחבר לאיכות לידים ולא רק לכמות?', 'מודדים המרה, אבל מסתכלים גם אם הפניות מתאימות לשיחה. שיפור יחס המרה בלי סינון יכול להביא עוד טפסים חלשים — ולכן השאלון והמסר חשובים לא פחות מהצבע של הכפתור.'],
  ],
  landing: [
    ['האם חובה דף נחיתה לכל קמפיין?', 'לא תמיד. לקמפיין מותג או לתנועה שמגיעה מחיפוש שם העסק, דף הבית יכול להספיק. לקמפיין לידים או הצעה ספציפית — דף נחיתה ייעודי בדרך כלל עדיף.'],
    ['מה ההבדל בין דף נחיתה לבין עמוד שירות באתר?', 'עמוד שירות עדיין חלק מהאתר: יש ניווט, קישורים פנימיים ומסר רחב יותר. דף נחיתה בנוי סביב פעולה אחת ומסר אחד, לרוב בלי תפריט מסיח.'],
    ['האם דף נחיתה משפיע על קידום אורגני?', 'דף נחיתה לקמפיין ממומן לא חייב להיות הדף העיקרי ל-SEO. אפשר (ולרוב כדאי) לסמן דפי קמפיין ב-noindex אם הם זמניים או מיועדים רק למודעות — ולשמור את דפי התוכן והבלוג לאינדוקס.'],
    ['כמה זמן לוקח לבנות דף נחיתה?', 'תלוי במורכבות: טופס פשוט מול שאלון חכם, עיצוב ומעקב. השאלה החשובה יותר היא האם המסר מחובר למודעה ולתהליך המכירה — לא רק כמה ימים לקח לעיצוב.'],
    ['איך יודעים אם הדף עובד?', 'לא רק לפי מספר לידים. בודקים גם שיעור המרה מקליק לפנייה, ואיכות הפניות (כמה ענו, כמה התאימו לשיחה). אם ה-CPL נמוך אבל המכירות לא זזות — כנראה המסר או הסינון חלשים.'],
    ['מה כולל אבחון קמפיין בהקשר לדף נחיתה?', 'בודקים את המסר במודעה מול מה שמופיע אחרי הקליק, את הטופס או השאלון, ואת נקודות החיכוך. המטרה: המלצה מעשית תוך 24 שעות — בלי התחייבות.'],
  ],
  campaigns: [
    ['כמה עולה קידום ממומן לעסק קטן?', 'זה תלוי בגודל העסקה ובתחרות בענף. עסקים עם עסקה קטנה יכולים להתחיל בתקציב מדיה מתון ולראות תוצאות ראשוניות תוך שבועות. עסקים עם עסקה גדולה זקוקים לתקציב גבוה יותר לפנייה, אבל שווי הלקוח מצדיק זאת.'],
    ['כמה זמן לוקח לראות תוצאות מקמפיין ממומן?', 'זה תלוי בעיקר בגובה התקציב ובאורך תהליך סגירת העסקה אצלכם. ברוב המקרים כבר בימים הראשונים אפשר לקבל אינדיקציה ראשונית אם הקמפיין עובד. תקציב נמוך יותר פשוט אומר שלוקח יותר זמן לאסוף מספיק נתונים כדי לדעת בוודאות.'],
    ['האם עדיף לנהל קמפיינים בעצמי או להעביר לסוכנות?', 'ניהול קמפיין דורש כמה דברים בו-זמנית: הגדרה מדויקת של קהל היעד, כתיבת מודעות מוכרות בכמה גרסאות, ויצירת באנר גרפי או סרטון וידאו עם כתוביות. כל טעות באחד מהשלבים האלה עולה כסף בפועל, בנוסף לזמן שדרוש כדי ללמוד את הכלים ולבנות ולראות תוצאה מהפרסום. מכאן כל עסק יכול להחליט בעצמו מה משתלם לו יותר.'],
    ['מה ההבדל בין קמפיין בפייסבוק לקמפיין בגוגל?', 'בגוגל פונים לאנשים שכבר מחפשים פתרון באופן פעיל. בפייסבוק ואינסטגרם פונים לאנשים שלא מחפשים כרגע, אבל אפשר לעורר אצלם עניין. הבחירה תלויה באיך קהל היעד שלך מתנהג. יש גם הבדל משמעותי במחיר: בגוגל משלמים על כל קליק, ולכן העלות בדרך כלל גבוהה יותר. בפייסבוק אפשר להגיע לחשיפה רחבה בהרבה, וכשמדובר במוצר או שירות מבוקש שמתאים לקהל רחב ולא לנישה מצומצמת, העלות יכולה להיות נמוכה משמעותית.'],
    ['האם צריך תקציב מדיה גבוה כדי להתחיל?', 'לא בהכרח. חשוב יותר שהתקציב הקיים יספיק לאיסוף נתונים מספק כדי לדעת מה עובד. באבחון ראשוני אפשר לבדוק אם התקציב שקיים כרגע יכול לייצר מספיק מידע לעבודה יעילה.'],
    ['איך יודעים אם קמפיין ממומן באמת מצליח?', 'לא רק לפי עלות לליד, אלא לפי כמה מהלידים האלה הופכים ללקוחות בפועל. קמפיין עם עלות לליד גבוהה יותר אבל איכות פניות טובה יותר יכול להיות משתלם יותר מקמפיין עם עלות זולה ולידים שלא מתקדמים.'],
    ['האם כדאי לפרסם בכמה פלטפורמות בו-זמנית?', 'לרוב עדיף להתחיל בפלטפורמה אחת, לוודא שהמסר והדף נחיתה עובדים, ורק אז להרחיב. פיזור תקציב קטן בין יותר מדי פלטפורמות מקשה על איסוף מספיק נתונים בכל אחת מהן.'],
    ['מה זה A/B טסטינג ולמה זה חשוב?', 'זו לא רק המלצה, אלא אחת הדרכים המרכזיות להוריד את העלות ללקוח ולהעלות את היעילות של הקמפיין. בדיקה מקצועית לא בודקת רק טקסט מודעה: בודקים גרסאות שונות של באנרים, סרטוני וידאו, דפי נחיתה ואפילו בלוקים בודדים בתוך הדף. בקייס של משרד עורכי דין, יותר מ-50 גרסאות מודעות נבדקו עד להגעה לתוצאה האופטימלית.'],
  ],
};

const expected = [
  {
    slug: 'shipur-yahas-hamara',
    ruSlug: 'povyshenie-konversii',
    title: 'שיפור יחס המרה: למה בדיקת מודעות בלבד כבר לא מספיקה',
    seoTitle: 'שיפור יחס המרה בדף נחיתה — בדיקות A/B מעבר למודעות | Profit Media',
    description: 'שיפור יחס המרה לא נגמר במודעה. איך מערכת A/B פנימית בודקת כותרות, כפתורים, פופאפים, וידאו מול תמונה — בלי שהלקוח מתעסק בכלים חיצוניים.',
    category: 'אופטימיזציית המרות',
    publishDate: '2026-07-25',
    readingText: '25 ביולי 2026 · 9 דקות קריאה',
    headings: ['למה "רק מודעות" זה מודל ישן', 'מה פיתחתי במקום אוסף כלים חיצוניים', 'מה אפשר לבדוק בפועל (לא רק תיאוריה)', 'איך נראה מחזור העבודה', 'מה הלקוח רואה — ומה לא', 'למי זה מתאים — ולמי פחות', 'קצת עליי (למה אני בכלל בונה ככה)', 'שורה תחתונה', 'שאלות נפוצות'],
    textHash: '60cc19a3a14fc085167fad6e8020456e718cd7f3b7468601ddc7293d5ffabcd6',
    domHash: '79c5709cb09aa2c41b892968246524051b07f3f7afee29e651ef9659a78fe313',
    hrefs: ['/blog/daf-nechita-mul-daf-habayit/', '/blog/kampeinim-memumanim-madrich/', '#contact'],
    counts: { table: 0, ul: 2, ol: 1, li: 16, blockquote: 0, callout: 1, pre: 0 },
    visual: { variant: 'conversion', breadcrumb: 'underlined', title: 'conversion', hero: 'flush' },
    image: { src: '/images/blog/shipur-yahas-hamara-wide.png', alt: 'איור זרימה: מודעה, דף נחיתה עם בדיקת A/B, כפתור ופופאפ, ואז המרה', width: '1200', height: '675' },
    faq: faqs.conversion,
    schemaImages: ['https://profitmedia.co.il/images/blog/shipur-yahas-hamara-wide.png', 'https://profitmedia.co.il/images/blog/shipur-yahas-hamara-square.png'],
  },
  {
    slug: 'daf-nechita-mul-daf-habayit',
    ruSlug: 'lending-ili-glavnaya',
    title: 'דף נחיתה לעסק מול דף הבית — לאן לשלוח את הקמפיין?',
    seoTitle: 'דף נחיתה לעסק מול דף הבית — מתי לא לשלוח לדף הבית | Profit Media',
    description: 'האם לשלוח קמפיין ממומן לדף הבית או לדף נחיתה ייעודי? השוואה ברורה, טבלת הבדלים, ומתי דף הבית כן מספיק — בלי הבטחות מכירות.',
    category: 'דפי נחיתה',
    publishDate: '2026-07-21',
    readingText: '21 ביולי 2026 · 8 דקות קריאה',
    headings: ['מה זה דף נחיתה לעסק', 'דף נחיתה מול דף הבית — השוואה', 'מתי כן אפשר לשלוח לדף הבית', 'למה קמפיין ממומן סובל מדף בית עמוס', 'מה חייב להיות בדף נחיתה שממיר', 'דוגמה מהשטח (בלי לחשוף לקוח)', 'שאלות נפוצות'],
    textHash: 'f9fc2c435cfe7bdfc9d7112e1e835b945903198f4560744a2978c8c75becd446',
    domHash: 'bcf82db8a6f9f33c9d43d1c19d63f4e9f727bcd4b477b64d67dc595e6af236f9',
    hrefs: [],
    counts: { table: 1, ul: 0, ol: 2, li: 8, blockquote: 0, callout: 1, pre: 0 },
    visual: { variant: 'standard', breadcrumb: 'weighted', title: 'standard', hero: 'framed' },
    image: { src: '/images/blog/daf-nechita-mul-daf-habayit-wide.png', alt: 'השוואה ויזואלית בין דף בית עם תפריט לבין דף נחיתה עם מסר אחד וקריאה לפעולה', width: '1200', height: '900' },
    faq: faqs.landing,
    schemaImages: ['https://profitmedia.co.il/images/blog/daf-nechita-mul-daf-habayit-wide.png', 'https://profitmedia.co.il/images/blog/daf-nechita-mul-daf-habayit-square.png'],
  },
  {
    slug: 'kampeinim-memumanim-madrich',
    ruSlug: 'kontekstnaya-reklama',
    title: 'קמפיינים ממומנים: כמה זה באמת עולה ולמי זה מתאים',
    seoTitle: 'קמפיינים ממומנים 2026 — כמה זה עולה ולמי זה מתאים | Profit Media',
    description: 'מדריך מלא לקמפיינים ממומנים בפייסבוק, אינסטגרם וגוגל — עלויות, טעויות נפוצות וקייסים אמיתיים מהשטח. כולל תשובות לשאלות הנפוצות ביותר.',
    category: 'קמפיינים ממומנים',
    publishDate: '2026-07-16',
    readingText: '16 ביולי 2026 · 7 דקות קריאה',
    headings: ['מה זה בעצם קידום ממומן', 'כמה עולה קידום ממומן בפועל', 'פייסבוק, אינסטגרם, גוגל או טיקטוק — מה מתאים למי', 'קייס אמיתי: מה קרה כשהחלפנו גישה', 'הטעויות הנפוצות שעסקים עושים כשהם מריצים קמפיינים בעצמם', 'שאלות נפוצות'],
    textHash: '812e4c19cd2a769e94a21049bb9175ae74ce5c2b6269ab9c618732425a032088',
    domHash: 'ee82ea72f9677a858f41edbee70d2976d88b54b8690710e990e6d23b076e96c1',
    hrefs: [],
    counts: { table: 0, ul: 4, ol: 0, li: 13, blockquote: 1, callout: 1, pre: 0 },
    visual: { variant: 'standard', breadcrumb: 'weighted', title: 'standard', hero: 'framed' },
    image: { src: '/images/blog/kampeinim-memumanim-wide-v3.png', alt: 'איור המשווה בין חיפוש פעיל בגוגל, טירגוט קהל יעד ותוכן שמעורר עניין ברשתות החברתיות', width: '1000', height: '666' },
    faq: faqs.campaigns,
    schemaImages: undefined,
  },
];

function assertHeadingAndHrefStructure(content, article) {
  assert.deepEqual(getElementTexts(content, 'h2'), article.headings, `${article.slug}: h2 hierarchy/text changed`);
  const hrefs = [...content.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/gi)].map((match) => decodeHtml(match[1]));
  assert.deepEqual(hrefs, article.hrefs, `${article.slug}: article hrefs changed`);
}

function runDetectorSelfTests() {
  const fixture = { slug: 'detector-fixture', headings: ['כותרת בדיקה'], hrefs: ['/target'] };
  const valid = '<h2>כותרת בדיקה</h2><p><a href="/target">קישור</a></p>';
  assert.doesNotThrow(() => assertHeadingAndHrefStructure(valid, fixture));
  assert.throws(
    () => assertHeadingAndHrefStructure('<p>כותרת בדיקה</p><p><a href="/target">קישור</a></p>', fixture),
    /h2 hierarchy\/text changed/,
  );
  assert.throws(
    () => assertHeadingAndHrefStructure('<h2>כותרת בדיקה</h2><p>קישור</p>', fixture),
    /article hrefs changed/,
  );
  const validDom = '<div class="blog-prose"><p>טקסט <strong>מודגש</strong></p></div>';
  const expectedDomHash = 'fa882c18af286e39c509caa0f3420d6e10bb7a85d4fd5b0cc05fc0e115cd4947';
  assert.equal(domSignatureHash(validDom), expectedDomHash);
  assert.notEqual(domSignatureHash(validDom.replace('<p>', '<div>').replace('</p>', '</div>')), expectedDomHash);
  assert.notEqual(domSignatureHash(validDom.replace(/<\/?strong>/g, '')), expectedDomHash);
  console.log('Structural detector red/green checks passed (heading, href, nesting, and strong mutations rejected).');
}

runDetectorSelfTests();

const { hasBlogTranslationPair } = await import('../src/lib/blog-pairing.ts');
const currentPost = { locale: 'he', translationKey: 'conversion-improvement' };
assert.equal(hasBlogTranslationPair(currentPost, []), false, 'no translation pair must disable alternates');
assert.equal(
  hasBlogTranslationPair(currentPost, [{ locale: 'ru', translationKey: 'conversion-improvement' }]),
  true,
  'opposite-locale matching translation key must enable alternates',
);
assert.equal(
  hasBlogTranslationPair(currentPost, [
    { locale: 'he', translationKey: 'conversion-improvement' },
    { locale: 'ru', translationKey: 'landing-vs-homepage' },
  ]),
  false,
  'same-locale or wrong-key posts must not enable alternates',
);

const { createServer } = await import('vite');
const vite = await createServer({ root, configFile: false, logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { getRouteAlternates } = await vite.ssrLoadModule('/src/i18n/seo.ts');
  assert.deepEqual(getRouteAlternates('conversionArticle'), [
    { hreflang: 'he-IL', href: 'https://profitmedia.co.il/blog/shipur-yahas-hamara' },
    { hreflang: 'ru', href: 'https://profitmedia.co.il/ru/blog/povyshenie-konversii' },
    { hreflang: 'x-default', href: 'https://profitmedia.co.il/blog/shipur-yahas-hamara' },
  ]);
} finally {
  await vite.close();
}
console.log('Translation-pair and route-alternate behavior checks passed.');

for (const path of [
  'src/content.config.ts',
  'src/lib/blog.ts',
  'src/lib/blog-pairing.ts',
  'src/components/blog/BlogArticleLayout.astro',
  'src/pages/blog/[slug].astro',
  ...expected.map(({ slug }) => `src/content/blog/he/${slug}.md`),
]) {
  assert.ok(existsSync(resolve(root, path)), `Missing Task 6 file: ${path}`);
}

for (const { slug } of expected) {
  assert.ok(!existsSync(resolve(root, `src/pages/blog/${slug}.astro`)), `Duplicate fixed route remains: ${slug}`);
}
assert.ok(!existsSync(resolve(root, 'src/data/blog.ts')), 'Retired src/data/blog.ts still exists');

const contentConfig = fromRoot('src/content.config.ts');
assert.match(contentConfig, /slug:\s*z\.string\(\)\.regex\(\s*\/\^\[a-z0-9\]\+\(\?:-\[a-z0-9\]\+\)\*\$\/\s*\)/);
const blogLibrary = fromRoot('src/lib/blog.ts');
assert.match(blogLibrary, /function assertUniquePosts/);
assert.match(blogLibrary, /translationKey/);
const route = fromRoot('src/pages/blog/[slug].astro');
assert.match(route, /render\s*\(\s*post\s*\)/);
const articleLayout = fromRoot('src/components/blog/BlogArticleLayout.astro');
assert.match(articleLayout, /getBlogTranslation/);
assert.match(articleLayout, /hasBlogTranslationPair/);
assert.match(articleLayout, /emitAlternates=\{hasTranslation\}/);
assertCssRule(articleLayout, '.blog-article--conversion .blog-breadcrumbs a', ['text-decoration: underline;']);
assertCssRule(articleLayout, '.blog-article--conversion .blog-article__eyebrow', ['margin: 0 0 0.75rem;', 'font-size: 0.875rem;', 'font-weight: 700;']);
assertCssRule(articleLayout, '.blog-article--conversion .blog-article__title', ['margin: 0 0 1rem;', 'color: #651561;', 'font-size: clamp(1.75rem, 4vw, 2.5rem);', 'line-height: 1.25;']);
assertCssRule(articleLayout, '.blog-article--conversion .blog-article__meta', ['flex-wrap: wrap;', 'margin-bottom: 1.5rem;', 'font-size: 0.875rem;']);
assertCssRule(articleLayout, '.blog-article--conversion .blog-article__figure', ['margin: 0;', 'overflow: hidden;', 'background: #faf8fc;']);
assertCssRule(articleLayout, '.blog-article--standard .blog-breadcrumbs a', ['font-weight: 600;']);
assertCssRule(articleLayout, '.blog-article--standard .blog-article__eyebrow', ['margin: 0;', 'font-size: 0.9375rem;', 'font-weight: 800;']);
assertCssRule(articleLayout, '.blog-article--standard .blog-article__title', ['margin: 0.6rem 0 0;', 'color: #111827;', 'font-size: 2rem;', 'line-height: 1.3;']);
assertCssRule(articleLayout, '.blog-article--standard .blog-article__meta', ['align-items: center;', 'margin-top: 0.9rem;', 'font-size: 0.9375rem;']);
assertCssRule(articleLayout, '.blog-article--standard .blog-article__figure', ['margin: 1.75rem 0 0;', 'padding: 1.5rem;', 'border: 1px solid rgba(101, 21, 97, 0.1);', 'background: linear-gradient(160deg, #faf8fc 0%, #f3edf5 100%);']);

for (const article of expected) {
  const outputPath = resolve(root, `dist/blog/${article.slug}/index.html`);
  assert.ok(existsSync(outputPath), `Missing /blog/${article.slug}`);
  const html = readFileSync(outputPath, 'utf8');
  const canonical = `https://profitmedia.co.il/blog/${article.slug}`;
  assert.equal(textContent(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? ''), article.seoTitle);
  const articleTag = html.match(/<article\b[^>]*>/i)?.[0];
  assert.ok(articleTag, `${article.slug}: missing article`);
  assert.equal(getAttribute(articleTag, 'data-visual-variant', article.slug), article.visual.variant);

  const h1 = html.match(/<h1\b[^>]*class="[^"]*blog-article__title[^"]*"[^>]*>[\s\S]*?<\/h1>/i)?.[0];
  assert.ok(h1, `${article.slug}: missing H1`);
  assert.equal(textContent(h1), article.title);
  assert.equal(getAttribute(h1, 'data-title-treatment', article.slug), article.visual.title);

  const breadcrumb = html.match(/<nav\b[^>]*class="[^"]*blog-breadcrumbs[^"]*"[^>]*>/i)?.[0];
  assert.ok(breadcrumb, `${article.slug}: missing breadcrumbs`);
  assert.equal(getAttribute(breadcrumb, 'data-breadcrumb-decoration', article.slug), article.visual.breadcrumb);

  const figure = html.match(/<figure\b[^>]*class="[^"]*blog-article__figure[^"]*"[^>]*>[\s\S]*?<img\b[^>]*>/i)?.[0];
  assert.ok(figure, `${article.slug}: missing hero figure`);
  assert.equal(getAttribute(figure, 'data-hero-treatment', article.slug), article.visual.hero);
  const imageTag = figure.match(/<img\b[^>]*>/i)?.[0];
  assert.ok(imageTag, `${article.slug}: missing hero image`);
  for (const attribute of ['src', 'alt', 'width', 'height']) {
    assert.equal(getAttribute(imageTag, attribute, article.slug), article.image[attribute]);
  }

  const proseStart = html.indexOf('<div class="blog-prose');
  const proseEnd = html.indexOf('<div class="blog-faq__list', proseStart);
  assert.ok(proseStart >= 0 && proseEnd > proseStart, `${article.slug}: missing prose region`);
  const prose = html.slice(proseStart, proseEnd);
  assertHeadingAndHrefStructure(prose, article);
  assert.equal(
    createHash('sha256').update(textContent(prose)).digest('hex'),
    article.textHash,
    `${article.slug}: article body text changed`,
  );
  assert.equal(domSignatureHash(prose), article.domHash, `${article.slug}: exact content DOM signature changed`);

  for (const [tag, count] of Object.entries(article.counts)) {
    const actual =
      tag === 'callout'
        ? (prose.match(/\bclass="[^"]*\bblog-callout\b[^"]*"/g) ?? []).length
        : (prose.match(new RegExp(`<${tag}\\b`, 'gi')) ?? []).length;
    assert.equal(actual, count, `${article.slug}: ${tag} count changed`);
  }

  assert.equal(getMeta(html, 'name', 'description', `${article.slug} description`), article.description);
  assert.equal(getMeta(html, 'property', 'og:title', `${article.slug} og:title`), article.seoTitle);
  assert.equal(getMeta(html, 'property', 'og:description', `${article.slug} og:description`), article.description);
  assert.equal(getMeta(html, 'property', 'og:url', `${article.slug} og:url`), canonical);
  assert.equal(getMeta(html, 'property', 'og:image', `${article.slug} og:image`), 'https://profitmedia.co.il/icons/site-icon.png');
  assert.equal(getMeta(html, 'property', 'og:locale', `${article.slug} og:locale`), 'he_IL');
  const canonicalTag = (html.match(/<link\b[^>]*rel="canonical"[^>]*>/gi) ?? [])[0];
  assert.ok(canonicalTag, `${article.slug}: missing canonical`);
  assert.equal(getAttribute(canonicalTag, 'href', article.slug), canonical);
  const languageAlternates = (html.match(/<link\b[^>]*rel="alternate"[^>]*hreflang="(?:ru|he-IL|x-default)"[^>]*>/gi) ?? [])
    .map((tag) => [
      getAttribute(tag, 'hreflang', article.slug),
      getAttribute(tag, 'href', article.slug),
    ]);
  assert.deepEqual(languageAlternates, [
    ['he-IL', canonical],
    ['ru', `https://profitmedia.co.il/ru/blog/${article.ruSlug}`],
    ['x-default', canonical],
  ], `${article.slug}: translation launch must emit exact reciprocal alternates`);

  const nodes = getJsonLdNodes(html);
  const posting = nodes.find((node) => node['@type'] === 'BlogPosting');
  const faqPage = nodes.find((node) => node['@type'] === 'FAQPage');
  assert.ok(posting && faqPage, `${article.slug}: missing article or FAQ schema`);
  assert.equal(posting.headline, article.title);
  assert.equal(posting.description, article.description);
  assert.equal(posting.datePublished, article.publishDate);
  assert.equal(posting.url, canonical);
  assert.deepEqual(posting.image, article.schemaImages);
  assert.deepEqual(
    faqPage.mainEntity.map((item) => [item.name, item.acceptedAnswer.text]),
    article.faq,
    `${article.slug}: FAQ schema changed`,
  );
  const visibleFaq = [...html.matchAll(/<details\b[^>]*class="[^"]*blog-faq__item[^"]*"[^>]*>([\s\S]*?)<\/details>/gi)].map(
    ([, details]) => [
      textContent(details.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ?? ''),
      textContent(details.match(/<div\b[^>]*class="[^"]*blog-faq__answer[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? ''),
    ],
  );
  assert.deepEqual(visibleFaq, article.faq, `${article.slug}: visible FAQ changed`);

  assert.match(html, /id="preview-contact-form"[^>]*data-locale="he"[^>]*data-thank-you="\/thank-you"/);
  assert.match(html, /id="lead-modal"[^>]*data-locale="he"[^>]*data-thank-you="\/thank-you"/);
  assert.match(textContent(html.match(/<div\b[^>]*class="[^"]*blog-article__meta[^"]*"[^>]*>[\s\S]*?<\/div>/i)?.[0] ?? ''), new RegExp(`^${article.readingText}$`));
}

const indexHtml = fromRoot('dist/blog/index.html');
for (const { slug } of expected) {
  assert.match(indexHtml, new RegExp(`href="/blog/${slug}"`), `Blog index lost /blog/${slug}`);
}

console.log('Task 6 immutable checks passed: structure, links, visuals, SEO, FAQ/schema, forms, and alternates.');
