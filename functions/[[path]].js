export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    
    // The first segment after the leading slash (e.g., 'foo' from '/foo/page')
    const projectSlug = pathParts[1];

    // Mapping of path slugs to their respective Cloudflare Pages domains
    const projectMap = {
      'hodorle': 'hodorle.pages.dev',
      'vibewho': 'vibewho.pages.dev',
      'startups': 'sagainsth.com'
    };

    if (projectSlug && projectMap[projectSlug]) {
      const targetDomain = projectMap[projectSlug];
      
      // Reconstruct the path for the sub-project
      // eeshan.pages.dev/foo/blah -> foo.pages.dev/blah
      const remainingPath = '/' + pathParts.slice(2).join('/');
      const targetUrl = new URL(remainingPath + url.search, `https://${targetDomain}`);

      const response = await fetch(targetUrl, {
        headers: request.headers,
        method: request.method,
        body: request.body,
        redirect: 'follow'
      });

      // Optional: Handle 404s from sub-projects or return the response directly
      return response;
    }

    // Fallback: Serve the main site eeshan.pages.dev
    return fetch(request);
  }
};
