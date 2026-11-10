import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The ERP back office is fully dynamic (session, tenant-scoped data).
  // Cache Components' prerender rules would force Suspense boundaries around
  // every authenticated page, which is not useful for this admin app.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
