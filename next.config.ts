import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  disable: true,
});

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
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