export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);

  // 1. Your allowed projects
  const MY_PROJECTS = ['vibewho', 'hodorle', 'sagainsth', 'becausefuckthat', 'thingsinrings'];

  const projectName = pathSegments[0];

  // 2. If it's a project path, proxy it
  if (projectName && MY_PROJECTS.includes(projectName)) {
    const targetBase = `https://${projectName}.pages.dev`;
    const remainingPath = '/' + pathSegments.slice(1).join('/');
    const targetURL = new URL(remainingPath, targetBase);

    // Fetch from the other project
    const response = await fetch(targetURL.toString(), request);

    // Fallback if the sub-project returns a 404
    if (response.status === 404) {
      return next();
    }

    return response;
  }

  // 3. Otherwise, serve the static files from your main repo
  return next();
}
