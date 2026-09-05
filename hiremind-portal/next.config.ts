import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    // Ensure root is correctly scoped
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
