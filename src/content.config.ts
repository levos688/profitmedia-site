import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    locale: z.enum(['he', 'ru']),
    translationKey: z.enum([
      'agency-pricing-guide',
      'agency-proposal-guide',
      'cac-vs-cpl-guide',
      'conversion-improvement',
      'digital-agency-choice',
      'landing-vs-homepage',
      'meta-crm-quality-feedback',
      'paid-campaigns-guide',
    ]),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string(),
    seoTitle: z.string(),
    description: z.string(),
    excerpt: z.string(),
    category: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    readingMinutes: z.number().int().positive(),
    author: z.string(),
    image: z.string(),
    imageAlt: z.string(),
    imageWide: z.string(),
    imageWideAlt: z.string(),
    visual: z.discriminatedUnion('variant', [
      z.object({
        variant: z.literal('conversion'),
        breadcrumb: z.literal('underlined'),
        title: z.literal('conversion'),
        hero: z.literal('flush'),
        heroWidth: z.literal(1200),
        heroHeight: z.literal(675),
      }),
      z.object({
        variant: z.literal('standard'),
        breadcrumb: z.literal('weighted'),
        title: z.literal('standard'),
        hero: z.literal('framed'),
        heroWidth: z.number().int().positive(),
        heroHeight: z.number().int().positive(),
      }),
    ]),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
  }),
});

export const collections = { blog };
