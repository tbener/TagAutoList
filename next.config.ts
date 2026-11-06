import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // CHANGELOG.md is read at runtime on the server; make sure it ships with the build.
  outputFileTracingIncludes: { "/*": ["./CHANGELOG.md"] },
};

export default nextConfig;
