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
    slug: 'daf-nechita-mul-daf-habayit',
    title: 'דף נחיתה לעסק מול דף הבית — לאן לשלוח את הקמפיין?',
    seoTitle: 'דף נחיתה לעסק מול דף הבית — מתי לא לשלוח לדף הבית | Profit Media',
    description:
      'האם לשלוח קמפיין ממומן לדף הבית או לדף נחיתה ייעודי? השוואה ברורה, טבלת הבדלים, ומתי דף הבית כן מספיק — בלי הבטחות מכירות.',
    excerpt:
      'למה תנועה בתשלום לדף בית עמוס מייקרת לידים, מתי דף הבית כן מתאים, ומה חייב להיות בדף נחיתה שממיר לפניות איכותיות.',
    category: 'דפי נחיתה',
    publishDate: '2026-07-21',
    readingMinutes: 8,
    image: '/images/blog/daf-nechita-mul-daf-habayit-square.png',
    imageAlt: 'איור של שני מסלולים — דף בית עמוס מול דף נחיתה ממוקד עם כפתור פעולה',
    imageWide: '/images/blog/daf-nechita-mul-daf-habayit-wide.png',
    imageWideAlt: 'השוואה ויזואלית בין דף בית עם תפריט לבין דף נחיתה עם מסר אחד וקריאה לפעולה',
  },
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
