/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "https://cmpdi-backend-ai.loca.lt";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
