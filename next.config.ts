import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The old path from before the rename.
  redirects: async () => [{ source: "/my-day", destination: "/up-next", permanent: false }],
  // CHANGELOG.md is read at runtime on the server; make sure it ships with the build.
  outputFileTracingIncludes: { "/*": ["./CHANGELOG.md"] },
};

export default nextConfig;
