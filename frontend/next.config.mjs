/** @type {import('next').NextConfig} */
const BACKEND_URL = "https://bca8978f4f1206.lhr.life";

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
