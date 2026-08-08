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
    slug: 'shipur-yahas-hamara',
    title: 'שיפור יחס המרה: למה בדיקת מודעות בלבד כבר לא מספיקה',
    seoTitle: 'שיפור יחס המרה בדף נחיתה — בדיקות A/B מעבר למודעות | Profit Media',
    description:
      'שיפור יחס המרה לא נגמר במודעה. איך מערכת A/B פנימית בודקת כותרות, כפתורים, פופאפים, וידאו מול תמונה — בלי שהלקוח מתעסק בכלים חיצוניים.',
    excerpt:
      'אם בודקים רק מודעות — או בכלל לא בודקים — מפסידים חלק גדול מהפוטנציאל. הנה איך נראית מערכת בדיקות מתמשכת על הדף עצמו.',
    category: 'אופטימיזציית המרות',
    publishDate: '2026-07-25',
    readingMinutes: 9,
    image: '/images/blog/shipur-yahas-hamara-square.png',
    imageAlt: 'איור של שתי גרסאות דף A ו-B עם כפתורי פעולה וחץ המרה כלפי מעלה',
    imageWide: '/images/blog/shipur-yahas-hamara-wide.png',
    imageWideAlt: 'איור זרימה: מודעה, דף נחיתה עם בדיקת A/B, כפתור ופופאפ, ואז המרה',
  },
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
    image: '/images/blog/kampeinim-memumanim-square-v4.png',
    imageAlt: 'איור של מגפון עם חץ צמיחה ומטבעות שקל, המסמל תקציב ותוצאות מקמפיינים ממומנים',
    imageWide: '/images/blog/kampeinim-memumanim-wide-v3.png',
    imageWideAlt: 'איור המשווה בין חיפוש פעיל בגוגל, טירגוט קהל יעד ותוכן שמעורר עניין ברשתות החברתיות',
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
