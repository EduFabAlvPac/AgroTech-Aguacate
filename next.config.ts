import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  disable: true,
});

const nextConfig: NextConfig = {
  // typedRoutes se movió de experimental a top-level en Next 15.5 (ver aviso
  // de deprecación al arrancar `next dev` tras el bump de esta sesión).
  typedRoutes: true,
  experimental: {
    staleTimes: {
      dynamic: 0,  // Don't cache dynamic pages in client-side router cache
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "openweathermap.org" },
    ],
  },
};

export default pwaConfig(nextConfig);