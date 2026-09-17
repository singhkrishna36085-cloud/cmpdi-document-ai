/** @type {import('next').NextConfig} */
const BACKEND_URL = "https://cmpdi-backend-ai.loca.lt";

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
