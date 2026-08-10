export interface UiStrings {
  skipLink: string;
  languages: {
    label: string;
    he: string;
    ru: string;
  };
  header: {
    home: string;
    primaryNav: string;
    mobileNav: string;
    menuOpen: string;
    menuClose: string;
  };
  footer: {
    nav: string;
    about: string;
    blog: string;
    accessibility: string;
    privacy: string;
  };
  sections: {
    systemComponentsTitle: string;
    systemComponentsSubtitle: string;
    clients: string;
    videoTestimonials: string;
    faqTitle: string;
    faqSubtitle: string;
    audienceOutcome: string;
    offerIncludes: string;
  };
  form: {
    name: string;
    phone: string;
    email: string;
    vertical: string;
    namePlaceholder: string;
    phonePlaceholder: string;
    emailPlaceholder: string;
    verticalPlaceholder: string;
    submit: string;
    sending: string;
    nameError: string;
    phoneError: string;
    verticalError: string;
    privacyError: string;
    genericError: string;
    privacyPrefix: string;
    privacyLink: string;
    privacySuffix: string;
  };
  modal: {
    close: string;
    title: string;
    subtitle: string;
    benefitsLabel: string;
  };
  blog: {
    eyebrow: string;
    title: string;
    subtitle: string;
    allPosts: string;
    readMore: string;
    back: string;
    readingMinutes: (minutes: number) => string;
  };
  accessibility: {
    videoPlayer: (title: string) => string;
    carouselNext: string;
    carouselPrevious: string;
    carouselClients: string;
    carouselLandings: string;
    ctaRegion: string;
  };
  portfolio: {
    title: string;
    subtitle: string;
    enlarge: (title: string) => string;
    close: string;
    previous: string;
    next: string;
  };
  thankYou: {
    title: string;
    description: string;
    heading: string;
    message: string;
    backHome: string;
  };
  notFound: {
    title: string;
    description: string;
    heading: string;
    backHome: string;
  };
}

export const ui = {
  skipLink: 'דילוג לתוכן',
  languages: {
    label: 'בחירת שפה',
    he: 'עברית',
    ru: 'Русский',
  },
  header: {
    home: 'Profit Media — דף הבית',
    primaryNav: 'ניווט ראשי',
    mobileNav: 'ניווט נייד',
    menuOpen: 'פתיחת תפריט',
    menuClose: 'סגירת תפריט',
  },
  footer: {
    nav: 'קישורים משפטיים',
    about: 'מי אנחנו',
    blog: 'בלוג',
    accessibility: 'הצהרת נגישות',
    privacy: 'מדיניות הפרטיות',
  },
  sections: {
    systemComponentsTitle: 'רכיבי המערכת',
    systemComponentsSubtitle:
      'שישה חלקים במחזור אחד — ממחקר והצעה ועד אופטימיזציית AI ופידבק לפלטפורמות',
    clients: 'לקוחות',
    videoTestimonials: 'עדויות וידאו',
    faqTitle: 'שאלות נפוצות',
    faqSubtitle: 'תשובות ברורות לפני שמתחילים',
    audienceOutcome: 'למה זה חשוב:',
    offerIncludes: 'מה כלול',
  },
  form: {
    name: 'שם מלא',
    phone: 'טלפון נייד',
    email: 'מייל',
    vertical: 'תחום העסק',
    namePlaceholder: 'שם מלא',
    phonePlaceholder: 'טלפון נייד',
    emailPlaceholder: 'מייל',
    verticalPlaceholder: 'באיזה תחום העסק?',
    submit: 'כן, אני רוצה אבחון חינם',
    sending: 'שולח…',
    nameError: 'נא להזין שם מלא',
    phoneError: 'נא להזין מספר טלפון תקין',
    verticalError: 'נא להזין את תחום העסק',
    privacyError: 'יש לאשר את מדיניות הפרטיות',
    genericError: 'שגיאה בשליחה. נסו שוב או כתבו ל-info@profitmedia.co.il',
    privacyPrefix: 'קראתי ואני מאשר/ת את ',
    privacyLink: 'מדיניות הפרטיות',
    privacySuffix: ', ומסכים/ה לשמירת המידע לצורך טיפול בפנייתי (חובה)',
  },
  modal: {
    close: 'סגור',
    title: 'קבלו אבחון חינם',
    subtitle: 'מענה אישי תוך 24 שעות',
    benefitsLabel: 'מה מקבלים',
  },
  blog: {
    eyebrow: 'מהבלוג של Profit Media',
    title: 'בלוג על פרסום ושיווק באינטרנט',
    subtitle: 'מדריכים ותובנות על קמפיינים ממומנים — בלי הבטחות גורפות.',
    allPosts: 'לכל המאמרים בבלוג',
    readMore: 'המשך קריאה',
    back: 'חזרה לבלוג',
    readingMinutes: (minutes) => `${minutes} דקות קריאה`,
  },
  accessibility: {
    videoPlayer: (title) => `נגן — ${title}`,
    carouselNext: 'גלול קדימה',
    carouselPrevious: 'גלול אחורה',
    carouselClients: 'לוגואים של לקוחות',
    carouselLandings: 'גלריית דפי נחיתה',
    ctaRegion: 'קריאה לפעולה',
  },
  portfolio: {
    title: 'דפי נחיתה ממירים במיוחד',
    subtitle: 'מבחר דפי נחיתה שבנינו לקמפיינים בתחומים שונים',
    enlarge: (title) => `הגדל — ${title}`,
    close: 'סגור',
    previous: 'דף נחיתה קודם',
    next: 'דף נחיתה הבא',
  },
  thankYou: {
    title: 'תודה שפנית אלינו | Profit Media',
    description: 'קיבלנו את פנייתך ונחזור אליך בהקדם האפשרי.',
    heading: 'תודה שפנית אלינו!',
    message: 'נחזור אליך בהקדם האפשרי',
    backHome: 'חזרה לדף הבית',
  },
  notFound: {
    title: '404 — דף לא נמצא | Profit Media',
    description: 'הדף שחיפשת לא נמצא.',
    heading: 'דף לא נמצא',
    backHome: 'חזרה לדף הבית',
  },
} satisfies UiStrings;
