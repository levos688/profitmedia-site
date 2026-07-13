/** Staging preview at /preview — re-exports production config with preview-only SEO */

export {
  homeCta as previewCta,
  homeNav as previewNav,
  faqs as previewFaqs,
  midPageCta,
  modalConfig,
  formPlaceholders,
  formLabels,
} from './site';

export const previewSeo = {
  title: '[תצוגה מקדימה] ניהול קמפיינים ועסקאות מהפרסום | Profit Media',
  description:
    'תצוגה מקדימה של שיפורי עיצוב וקונברזיה: צבעים, קריאות לפעולה, טופס אבחון ושאלות נפוצות.',
  canonical: 'https://profitmedia.co.il/preview',
};
