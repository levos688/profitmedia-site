export interface BlogPost {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  excerpt: string;
  category: string;
  publishDate: string;
  readingMinutes: number;
  image: string;
  imageAlt: string;
  imageWide: string;
  imageWideAlt: string;
}

export const blogSeo = {
  title: 'בלוג Profit Media — מדריכים על פרסום ממומן וקמפיינים',
  description:
    'מדריכים מעשיים על קמפיינים ממומנים בפייסבוק, אינסטגרם וגוגל — עלויות, קייסים אמיתיים וטעויות נפוצות לעסקים בישראל.',
  canonical: 'https://profitmedia.co.il/blog',
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'kampeinim-memumanim-madrich',
    title: 'קמפיינים ממומנים: כמה זה באמת עולה ולמי זה מתאים',
    seoTitle: 'קמפיינים ממומנים 2026 — כמה זה עולה ולמי זה מתאים | Profit Media',
    description:
      'מדריך מלא לקמפיינים ממומנים בפייסבוק, אינסטגרם וגוגל — עלויות, טעויות נפוצות וקייסים אמיתיים מהשטח. כולל תשובות לשאלות הנפוצות ביותר.',
    excerpt:
      'עלות ניהול מול תקציב מדיה, איך בוחרים בין פייסבוק, אינסטגרם, גוגל וטיקטוק, וקייסים עם מספרים אמיתיים מלקוחות שלנו.',
    category: 'קמפיינים ממומנים',
    publishDate: '2026-07-16',
    readingMinutes: 7,
    image: '/images/blog/kampeinim-memumanim-square.png',
    imageAlt: 'איור של מגפון עם חץ צמיחה ומטבעות שקל, המסמל תקציב ותוצאות מקמפיינים ממומנים',
    imageWide: '/images/blog/kampeinim-memumanim-wide.png',
    imageWideAlt: 'איור המשווה בין חיפוש פעיל בגוגל, טירגוט קהל יעד ותוכן שמעורר עניין ברשתות החברתיות',
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
