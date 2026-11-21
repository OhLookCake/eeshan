const UPSTREAM = 'https://benchmarkbench.pages.dev';
const MOUNT = '/benchmarkbench';

function maskedUrl(value, upstreamUrl) {
  if (!value || value.startsWith('#')) return value;
  let url;
  try {
    url = new URL(value, upstreamUrl);
  } catch {
    return value;
  }
  if (url.origin !== UPSTREAM) return value;
  return `${MOUNT}${url.pathname}${url.search}${url.hash}`;
}

export async function onRequest({ request }) {
  const incoming = new URL(request.url);
  const upstreamUrl = new URL(UPSTREAM);
  upstreamUrl.pathname = incoming.pathname.slice(MOUNT.length) || '/';
  upstreamUrl.search = incoming.search;

  const headers = new Headers(request.headers);
  headers.set('Host', upstreamUrl.host);
  headers.delete('Cookie');
  headers.delete('Authorization');

  let upstream;
  try {
    upstream = await fetch(new Request(new Request(upstreamUrl, request), {
      headers,
      redirect: 'manual'
    }));
  } catch {
    return new Response('BenchmarkBench is temporarily unavailable. Please try again shortly.', {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('Set-Cookie');
  const location = responseHeaders.get('Location');
  if (location) responseHeaders.set('Location', maskedUrl(location, upstreamUrl));

  const html = (responseHeaders.get('Content-Type') || '').includes('text/html');
  if (html) {
    responseHeaders.delete('Content-Length');
    responseHeaders.delete('Content-Encoding');
    responseHeaders.delete('ETag');
  }
  const response = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
  if (!html || request.method === 'HEAD') return response;

  return new HTMLRewriter().on('*', {
    element(element) {
      for (const attribute of ['href', 'src', 'action', 'poster']) {
        const value = element.getAttribute(attribute);
        if (value !== null) element.setAttribute(attribute, maskedUrl(value, upstreamUrl));
      }
    }
  }).transform(response);
}
