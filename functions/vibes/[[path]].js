const BEAR_ORIGIN = 'https://vibember.bearblog.dev';
const MOUNT = '/vibes';
const COOKIE_PREFIX = 'bear_vibes_';

function publicUrl(value, upstreamUrl, siteOrigin) {
  if (!value || value.startsWith('#')) return value;

  let target;
  try {
    target = new URL(value, upstreamUrl);
  } catch {
    return value;
  }

  if (!['https:', 'http:'].includes(target.protocol) ||
      target.hostname !== 'vibember.bearblog.dev' || target.port) return value;

  const path = target.pathname === '/' ? '' : target.pathname;
  return `${siteOrigin}${MOUNT}${path}${target.search}${target.hash}`;
}

function rewriteCss(css, upstreamUrl, siteOrigin) {
  return css.replace(/url\(\s*(?:(["'])(.*?)\1|([^\s)]*))\s*\)/gi,
    (match, quote, quoted, unquoted) => {
      const original = quoted ?? unquoted;
      const rewritten = publicUrl(original, upstreamUrl, siteOrigin);
      return original === rewritten ? match : `url("${rewritten}")`;
    }).replace(/(@import\s+)(["'])(.*?)\2/gi,
      (_, prefix, quote, value) => `${prefix}${quote}${publicUrl(value, upstreamUrl, siteOrigin)}${quote}`);
}

function rewriteScript(script, siteOrigin) {
  return script
    .replaceAll(BEAR_ORIGIN, `${siteOrigin}${MOUNT}`)
    .replaceAll('http://vibember.bearblog.dev', `${siteOrigin}${MOUNT}`)
    // Bear's vote requests and analytics image use root-relative JS URLs.
    // Restrict this to request expressions: literals such as token: "/" are data.
    .replace(/(\bfetch\s*\(\s*["'`])\/(?!\/)/g, `$1${MOUNT}/`)
    .replace(/(\.src\s*=\s*["'`])\/(?!\/)/g, `$1${MOUNT}/`)
    .replace(/;\s*path=\/(?=["'`;])/gi, `;path=${MOUNT}`);
}

class TextRewriter {
  constructor(rewrite) {
    this.rewrite = rewrite;
  }

  element(element) {
    this.content = '';
    element.onEndTag(end => end.before(this.rewrite(this.content), { html: true }));
  }

  text(chunk) {
    this.content += chunk.text;
    chunk.remove();
  }
}

function rewriteHtml(response, upstreamUrl, siteOrigin) {
  const attributes = ['href', 'src', 'action', 'formaction', 'poster', 'data', 'cite'];
  return new HTMLRewriter()
    .on('*', {
      element(element) {
        for (const attribute of attributes) {
          const value = element.getAttribute(attribute);
          if (value !== null) element.setAttribute(attribute, publicUrl(value, upstreamUrl, siteOrigin));
        }

        const srcset = element.getAttribute('srcset');
        if (srcset) {
          element.setAttribute('srcset', srcset.replace(
            /(^|,\s*)((?:https?:)?\/\/vibember\.bearblog\.dev[^\s,]*|\/(?!\/)[^\s,]*)/g,
            (_, prefix, value) => prefix + publicUrl(value, upstreamUrl, siteOrigin)));
        }

        const style = element.getAttribute('style');
        if (style) element.setAttribute('style', rewriteCss(style, upstreamUrl, siteOrigin));

        if (element.tagName === 'meta') {
          const property = element.getAttribute('property') || element.getAttribute('name') || '';
          if (/^(og:|twitter:)/.test(property)) {
            const value = element.getAttribute('content');
            if (/^(https?:)?\//.test(value || '')) {
              element.setAttribute('content', publicUrl(value, upstreamUrl, siteOrigin));
            }
          }
        }
      }
    })
    .on('style', new TextRewriter(css => rewriteCss(css, upstreamUrl, siteOrigin)))
    .on('script:not([src])', new TextRewriter(script => rewriteScript(script, siteOrigin)))
    .transform(response);
}

function requestHeaders(request, upstreamUrl) {
  const headers = new Headers(request.headers);
  headers.set('Host', upstreamUrl.host);
  headers.delete('Authorization');
  headers.delete('If-None-Match');
  headers.delete('If-Modified-Since');

  // Only send this proxy's cookies to Bear, not other cookies on the main site.
  const cookies = (headers.get('Cookie') || '').split(/;\s*/).flatMap(cookie => {
    if (cookie.startsWith(COOKIE_PREFIX)) return [cookie.slice(COOKIE_PREFIX.length)];
    if (cookie.startsWith('timezone=')) return [cookie];
    return [];
  });
  if (cookies.length) headers.set('Cookie', cookies.join('; '));
  else headers.delete('Cookie');

  const incoming = new URL(request.url);
  if (headers.get('Origin') === incoming.origin) headers.set('Origin', BEAR_ORIGIN);
  const referer = headers.get('Referer');
  if (referer) {
    const source = new URL(referer);
    if (source.origin === incoming.origin &&
        (source.pathname === MOUNT || source.pathname.startsWith(`${MOUNT}/`))) {
      source.pathname = source.pathname.slice(MOUNT.length) || '/';
      headers.set('Referer', `${BEAR_ORIGIN}${source.pathname}${source.search}`);
    }
  }
  return headers;
}

function responseHeaders(response, upstreamUrl, siteOrigin) {
  const headers = new Headers(response.headers);
  const location = headers.get('Location');
  if (location) headers.set('Location', publicUrl(location, upstreamUrl, siteOrigin));

  const cookies = response.headers.getSetCookie
    ? response.headers.getSetCookie()
    : response.headers.getAll('Set-Cookie');
  headers.delete('Set-Cookie');
  for (const cookie of cookies) {
    let scoped = cookie
      .replace(/^([^=]+)=/, `${COOKIE_PREFIX}$1=`)
      .replace(/;\s*Domain=[^;]*/gi, '');
    if (/;\s*Path=/i.test(scoped)) {
      scoped = scoped.replace(/;\s*Path=([^;]*)/i, (_, path) => `; Path=${MOUNT}${path === '/' ? '' : path}`);
    } else {
      scoped += `; Path=${MOUNT}`;
    }
    headers.append('Set-Cookie', scoped);
  }
  return headers;
}

export async function onRequest({ request }) {
  const incoming = new URL(request.url);
  const upstreamUrl = new URL(BEAR_ORIGIN);
  // Assign pathname instead of resolving it as a URL: //foo must stay on Bear.
  upstreamUrl.pathname = incoming.pathname.slice(MOUNT.length) || '/';
  upstreamUrl.search = incoming.search;

  let upstream;
  try {
    const forwarded = new Request(upstreamUrl, request);
    upstream = await fetch(new Request(forwarded, {
      headers: requestHeaders(request, upstreamUrl),
      redirect: 'manual'
    }));
  } catch {
    return new Response('The blog is temporarily unavailable. Please try again shortly.', {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  const headers = responseHeaders(upstream, upstreamUrl, incoming.origin);
  const type = (headers.get('Content-Type') || '').toLowerCase();
  const html = type.includes('text/html');
  const css = type.includes('text/css');
  const script = /(?:application|text)\/(?:java|ecma)script/.test(type);
  const xml = type.includes('xml');

  if (html || css || script || xml) {
    headers.delete('Content-Length');
    headers.delete('ETag');
    headers.delete('Content-Encoding');
  }

  const response = new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
  if (request.method === 'HEAD' || [204, 205, 304].includes(upstream.status)) return response;
  if (html) return rewriteHtml(response, upstreamUrl, incoming.origin);
  if (css || script || xml) {
    const body = await response.text();
    const rewritten = css ? rewriteCss(body, upstreamUrl, incoming.origin)
      : script ? rewriteScript(body, incoming.origin)
      : body.replaceAll(BEAR_ORIGIN, `${incoming.origin}${MOUNT}`);
    return new Response(rewritten, response);
  }
  return response;
}
