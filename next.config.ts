import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Remove "X-Powered-By: Next.js" header for security
  poweredByHeader: false,

  images: {
    remotePatterns: [],
  },

  // Server Actions are stable in Next.js 14+; bodySizeLimit is still configured here
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
