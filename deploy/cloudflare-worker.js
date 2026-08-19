// Cloudflare Worker: serve the GitHub Pages build under
// https://www.oursharedcode.com/prompt-engineering-studio
//
// Setup (www.oursharedcode.com must be a zone on your Cloudflare account):
//   1. Cloudflare dashboard → Workers & Pages → Create Worker → paste this file.
//   2. Worker → Settings → Domains & Routes → Add route:
//        Route:  www.oursharedcode.com/prompt-engineering-studio*
//        Zone:   oursharedcode.com
//   3. Done. The worker proxies every request under that path to the
//      GitHub Pages origin; because the app is built with relative asset
//      URLs (vite `base: "./"`), no HTML rewriting is needed.

const ORIGIN = "https://oursharedcode.github.io/promengi-simple";
const PREFIX = "/prompt-engineering-studio";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(PREFIX)) {
      return new Response("Not found", { status: 404 });
    }

    // "/prompt-engineering-studio" (no trailing slash) → redirect so that
    // relative asset URLs resolve inside the path, not beside it.
    if (url.pathname === PREFIX) {
      return Response.redirect(`${url.origin}${PREFIX}/${url.search}`, 301);
    }

    let rest = url.pathname.slice(PREFIX.length); // starts with "/"
    if (rest === "/") rest = "/index.html";

    const originResponse = await fetch(`${ORIGIN}${rest}${url.search}`, {
      headers: { Accept: request.headers.get("Accept") || "*/*" },
    });

    // Re-wrap so we control caching on our own hostname.
    const headers = new Headers(originResponse.headers);
    headers.delete("x-github-request-id");
    headers.set(
      "Cache-Control",
      rest === "/index.html" ? "public, max-age=300" : "public, max-age=86400"
    );
    return new Response(originResponse.body, {
      status: originResponse.status,
      headers,
    });
  },
};
