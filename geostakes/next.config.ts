import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to silence warning about having webpack config
  // Turbopack is the default bundler in Next.js 16
  turbopack: {},
  // Webpack externals still needed when using --webpack flag
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
