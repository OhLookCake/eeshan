export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/').filter(Boolean); // Remove empty strings
  const projectSlug = pathParts[0]; // Now 'foo' is at index 0

  const projectMap = {
    'hodorle': 'hodorle.pages.dev',
    'vibewho': 'vibewho.pages.dev',
    'startups': 'sagainsth.com'
  };

  if (projectSlug && projectMap[projectSlug]) {
    const targetDomain = projectMap[projectSlug];
    const remainingPath = '/' + pathParts.slice(1).join('/');
    const targetUrl = new URL(remainingPath + url.search, `https://${targetDomain}`);

    console.log(`Proxying to: ${targetUrl.toString()}`);

    return fetch(targetUrl, {
      headers: context.request.headers,
      method: context.request.method,
      redirect: 'follow'
    });
  }

  return context.next();
}
