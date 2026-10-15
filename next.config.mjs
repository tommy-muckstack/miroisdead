const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/miroisdead";
export default {
  basePath,
  // `ws` must stay a real Node module at runtime (bundling it breaks its masking helpers on Vercel).
  serverExternalPackages: ["ws", "@vercel/functions"],
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // PostHog reverse proxy (same origin, so ad blockers don't drop analytics). Trailing slashes are passed through untouched.
  skipTrailingSlashRedirect: true,
  async rewrites() { return [{ source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" }, { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" }]; },
};
