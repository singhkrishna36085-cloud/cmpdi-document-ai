/** @type {import('next').NextConfig} */
const defaultBackendUrl = process.env.NODE_ENV === "production"
  ? "https://cmpdi-backend-d3h9.onrender.com"
  : "http://127.0.0.1:8000";

const rawBackendUrl = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || defaultBackendUrl;
const BACKEND_URL = (rawBackendUrl || "https://cmpdi-backend-d3h9.onrender.com").replace(/\/$/, "");

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
