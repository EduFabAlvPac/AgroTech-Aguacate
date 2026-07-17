import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    // No hacer precache de los chunks de Next.js — se sirven siempre desde red
    skipWaiting: true,
    cleanupOutdatedCaches: true,
    exclude: [/chunks\/.*$/],
    runtimeCaching: [
      // API routes: siempre red, sin caché (DEBE ser primera regla)
      {
        urlPattern: /\/api\//,
        handler: "NetworkOnly",
      },
      // Assets estáticos de Next.js: siempre desde red primero
      {
        urlPattern: /^\/_next\/static\/.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "next-static",
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
      // Imágenes y fuentes
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      // Páginas de la app
      {
        urlPattern: /^https?.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "offlineCache",
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "openweathermap.org" },
    ],
  },
};

export default pwaConfig(nextConfig);
