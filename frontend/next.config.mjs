/** @type {import('next').NextConfig} */
const BACKEND_URL = "https://729eaa6a814492.lhr.life";

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
