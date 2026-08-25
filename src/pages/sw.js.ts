import swSource from '../sw.js?raw';

// Serves the service worker through SSR so it can be sent with
// `Cache-Control: no-store`. A static file would be served by the node
// adapter's static handler without cache headers, letting browsers (and
// proxies) keep the OLD service worker alive after a deploy — which is why
// clients kept the previous app version in production.
export const GET = () => {
  return new Response(swSource, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Never allow the SW script itself to be cached: the browser must
      // revalidate it on every update check so new deploys take effect.
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  });
};
