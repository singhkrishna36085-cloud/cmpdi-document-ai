/** @type {import('next').NextConfig} */
const BACKEND_URL = "https://2ebd0d87d52155.lhr.life";

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
