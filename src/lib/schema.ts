import type { Locale } from '../i18n/config';

const SITE_URL = 'https://profitmedia.co.il';
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const LOGO_URL = `${SITE_URL}/icons/site-icon.png`;

export type SchemaNode = Record<string, unknown>;
export type SchemaGraph = {
  '@context': 'https://schema.org';
  '@graph': SchemaNode[];
};

type FaqItem = { question: string; answer: string };
type BreadcrumbItem = { name: string; item: string };

export const schemaLanguage = (locale: Locale): 'he-IL' | 'ru' =>
  locale === 'he' ? 'he-IL' : 'ru';

export function buildSchemaGraph(nodes: SchemaNode[]): SchemaGraph {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

export function buildOrganizationSchema(input: {
  locale: Locale;
  description: string;
  serviceTypes: readonly string[];
  audience: string;
}): SchemaNode {
  return {
    '@type': 'ProfessionalService',
    '@id': ORGANIZATION_ID,
    name: 'Profit Media',
    ...(input.locale === 'he' ? { alternateName: 'פרופיט מדיה' } : {}),
    url: `${SITE_URL}/`,
    logo: LOGO_URL,
    image: LOGO_URL,
    description: input.description,
    inLanguage: schemaLanguage(input.locale),
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IL',
    },
    serviceType: input.serviceTypes,
    knowsAbout: [
      'Facebook Ads',
      'Google Ads',
      'Instagram Ads',
      'Landing pages',
      'Conversion rate optimization',
      'Deal CRM',
      'Offline conversions / lead quality feedback (Meta, Google, TikTok)',
      'A/B testing',
      'High-ticket sales',
    ],
    audience: {
      '@type': 'BusinessAudience',
      audienceType: input.audience,
    },
    availableLanguage: ['he', 'ru'],
  };
}

export function buildWebsiteSchema(input: {
  locale: Locale;
  description: string;
}): SchemaNode {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: 'Profit Media',
    description: input.description,
    inLanguage: schemaLanguage(input.locale),
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export function buildWebPageSchema(input: {
  locale: Locale;
  canonical: string;
  name: string;
  description: string;
  image?: string;
}): SchemaNode {
  return {
    '@type': 'WebPage',
    '@id': `${input.canonical}#webpage`,
    url: input.canonical,
    name: input.name,
    description: input.description,
    inLanguage: schemaLanguage(input.locale),
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORGANIZATION_ID },
    ...(input.image
      ? { primaryImageOfPage: { '@type': 'ImageObject', url: input.image } }
      : {}),
  };
}

export function buildServiceSchema(input: {
  locale: Locale;
  name: string;
  description: string;
  serviceTypes: readonly string[];
}): SchemaNode {
  return {
    '@type': 'Service',
    name: input.name,
    description: input.description,
    inLanguage: schemaLanguage(input.locale),
    provider: { '@id': ORGANIZATION_ID },
    areaServed:
      input.locale === 'he'
        ? { '@type': 'Country', name: 'Israel' }
        : { '@type': 'Place', name: 'Worldwide' },
    serviceType: input.serviceTypes,
  };
}

export function buildFaqPageSchema(input: {
  locale: Locale;
  canonical?: string;
  items: readonly FaqItem[];
}): SchemaNode {
  return {
    '@type': 'FAQPage',
    ...(input.canonical ? { '@id': `${input.canonical}#faq` } : {}),
    inLanguage: schemaLanguage(input.locale),
    mainEntity: input.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function buildAboutPageSchema(input: {
  locale: Locale;
  canonical: string;
  name: string;
  description: string;
}): SchemaNode {
  return {
    '@type': 'AboutPage',
    '@id': `${input.canonical}#webpage`,
    url: input.canonical,
    name: input.name,
    description: input.description,
    inLanguage: schemaLanguage(input.locale),
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORGANIZATION_ID },
    mainEntity: { '@id': `${input.canonical}#person` },
  };
}

export function buildPersonSchema(input: {
  locale: Locale;
  canonical: string;
  name: string;
  jobTitle: string;
  email: string;
  image: string;
  description: string;
}): SchemaNode {
  return {
    '@type': 'Person',
    '@id': `${input.canonical}#person`,
    name: input.name,
    url: `${input.canonical}#founder`,
    jobTitle: input.jobTitle,
    inLanguage: schemaLanguage(input.locale),
    worksFor: { '@id': ORGANIZATION_ID },
    email: input.email,
    image: input.image,
    description: input.description,
  };
}

export function buildBlogSchema(input: {
  locale: Locale;
  canonical: string;
  name: string;
  description: string;
  posts: readonly {
    title: string;
    url: string;
    publishDate: string;
  }[];
}): SchemaNode {
  return {
    '@type': 'Blog',
    '@id': `${input.canonical}#blog`,
    url: input.canonical,
    name: input.name,
    description: input.description,
    inLanguage: schemaLanguage(input.locale),
    publisher: { '@id': ORGANIZATION_ID },
    blogPost: input.posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: post.url,
      datePublished: post.publishDate,
      inLanguage: schemaLanguage(input.locale),
    })),
  };
}

export function buildBlogPostingSchema(input: {
  locale: Locale;
  canonical: string;
  headline: string;
  description: string;
  publishDate: string;
  modifiedDate: string;
  author: string;
  authorUrl: string;
  images?: readonly string[];
}): SchemaNode {
  return {
    '@type': 'BlogPosting',
    '@id': `${input.canonical}#article`,
    headline: input.headline,
    description: input.description,
    datePublished: input.publishDate,
    dateModified: input.modifiedDate,
    inLanguage: schemaLanguage(input.locale),
    mainEntityOfPage: input.canonical,
    url: input.canonical,
    ...(input.images?.length ? { image: input.images } : {}),
    author: {
      '@type': 'Person',
      name: input.author,
      url: input.authorUrl,
    },
    publisher: {
      '@id': ORGANIZATION_ID,
      logo: {
        '@type': 'ImageObject',
        url: LOGO_URL,
      },
    },
  };
}

export function buildBreadcrumbListSchema(input: {
  locale: Locale;
  items: readonly BreadcrumbItem[];
}): SchemaNode {
  return {
    '@type': 'BreadcrumbList',
    inLanguage: schemaLanguage(input.locale),
    itemListElement: input.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
}

export function buildItemListSchema(input: {
  locale: Locale;
  canonical: string;
  name: string;
  description: string;
  items: readonly { title: string; description: string }[];
}): SchemaNode {
  return {
    '@type': 'ItemList',
    '@id': `${input.canonical}#for-whom`,
    name: input.name,
    description: input.description,
    inLanguage: schemaLanguage(input.locale),
    itemListElement: input.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.title,
      description: item.description,
    })),
  };
}

export function buildHowToSchema(input: {
  locale: Locale;
  canonical: string;
  name: string;
  description: string;
  steps: readonly { title: string; description: string }[];
}): SchemaNode {
  return {
    '@type': 'HowTo',
    '@id': `${input.canonical}#how-it-works`,
    name: input.name,
    description: input.description,
    inLanguage: schemaLanguage(input.locale),
    step: input.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.description,
    })),
  };
}
