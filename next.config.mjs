const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/miroisdead";
export default {
  basePath,
  // `ws` must stay a real Node module at runtime (bundling it breaks its masking helpers on Vercel).
  serverExternalPackages: ["ws", "@vercel/functions"],
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};
