/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async headers() {
    return [
      {
        // A service worker's scope defaults to the directory its script sits
        // in, so /todotwo/sw.js can only control /todotwo/*. Scope matching is
        // a plain string prefix, and "/todotwo" is not prefixed by "/todotwo/"
        // — which would leave the Today view, the single most important screen
        // and the app's start_url, permanently uncontrolled and unavailable
        // offline. This header widens the scope by exactly one character and
        // nothing else; the storefront stays outside it.
        //
        // Registration falls back to the default scope if this header does not
        // arrive, so a CDN that drops it degrades rather than breaks. See
        // docs/todotwo/PWA.md.
        source: '/todotwo/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/todotwo' },
          // The worker must never be cached by an intermediary: a stale copy
          // cannot be replaced by shipping a new one.
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
