export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const gameOffset = pathParts[0] === 'games' ? 1 : 0;
  const gameSlug = pathParts[gameOffset];
  const gameBase = `${gameOffset ? '/games' : ''}/${gameSlug}`;

  const gameMap = {
    'hodorle': 'hodorle.pages.dev',
    'vibewho': 'vibewho.pages.dev',
    'startups-against-humanity': 'startups-against-humanity.pages.dev',
    'letters-practice': 'letters-practice.pages.dev',
    'venn-in-doubt': 'things-in-rings.pages.dev',
    'backtrack': 'backtrack-61p.pages.dev',
    '1d-chess': '1d-chess-960.pages.dev',
    'frequency': 'frequency-3pc.pages.dev',
    'jolie-guacamole': 'jolie-guacamole.pages.dev',
    'cross-section': 'cross-section.pages.dev'
  };

  if (gameSlug && gameMap[gameSlug]) {
    // Force trailing slash redirect
    if (url.pathname === gameBase) {
      return Response.redirect(`${url.origin}${gameBase}/${url.search}`, 301);
    }

    const targetDomain = gameMap[gameSlug];
    const remainingPath = url.pathname.slice(gameBase.length);
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
