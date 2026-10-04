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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stop other sites framing Vault pages (clickjacking on pay/confirm buttons).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  poweredByHeader: false,
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
