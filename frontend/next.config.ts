import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/pc-store-backend/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
