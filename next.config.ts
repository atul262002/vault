import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Type errors fail the production build. The codebase type-checks cleanly,
  // so keep it that way instead of shipping type errors.
  typescript: {
    ignoreBuildErrors: false,
  },
  // Remaining lint findings are stylistic (unused vars, `any`); lint is run
  // separately with `npm run lint` rather than blocking deploys.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "ik.imagekit.io",
      },
      {
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
