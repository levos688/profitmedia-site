/** Google Search Console HTML-file verification (exact .html URL). */
export async function onRequest() {
  return new Response('google-site-verification: googleae2d1f2277e31c67.html\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Robots-Tag': 'noindex',
    },
  });
}
