export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const projectSlug = pathParts[0];

  const projectMap = {
    'hodorle': 'hodorle.pages.dev',
    'vibewho': 'vibewho.pages.dev',
    'startups-against-humanity': 'startups-against-humanity.pages.dev',
    'letters-practice': 'letters-practice.pages.dev',
    'venn-in-doubt': 'things-in-rings.pages.dev',
    'backtrack': 'backtrack-61p.pages.dev',
    '1d-chess': '1d-chess-960.pages.dev',
    'frequency': 'frequency-3pc.pages.dev'
  };

  if (projectSlug && projectMap[projectSlug]) {
    // Force trailing slash redirect
    if (url.pathname === `/${projectSlug}`) {
      return Response.redirect(`${url.origin}/${projectSlug}/`, 301);
    }

    const targetDomain = projectMap[projectSlug];
    const remainingPath = '/' + pathParts.slice(1).join('/');
    const targetUrl = new URL(remainingPath + url.search, `https://${targetDomain}`);

    // Clone headers to avoid mutating the original request
    const newHeaders = new Headers(context.request.headers);

    // CRITICAL: Set the Host header to the target domain
    newHeaders.set('Host', targetDomain);

    return fetch(targetUrl, {
      headers: newHeaders,
      method: context.request.headers.get('Method') || 'GET',
      redirect: 'follow'
    });
  }

  return context.next();
}
