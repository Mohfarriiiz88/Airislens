import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.76:3000"],
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["node_modules/sharp/**/*"],
  },
};

export default nextConfig;
