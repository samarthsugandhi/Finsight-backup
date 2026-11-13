import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5002";

const nextConfig = {
  // Turbopack root override — only for local dev; Vercel uses the standard webpack bundler.
  // This avoids path resolution issues on the Vercel build grid.
  ...(process.env.NODE_ENV !== "production" && {
    turbopack: {
      root: path.resolve(__dirname),
    },
  }),

  // Proxy /api/* to the backend so the browser stays on one origin.
  // Set BACKEND_URL in Vercel env vars to point to your deployed backend.
  // Locally it defaults to http://localhost:5002.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
