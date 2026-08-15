import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AnchoPantallaSync } from "@/components/shared/AnchoPantallaSync";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GermIA — Gestión inteligente de cultivos",
    template: "%s | GermIA",
  },
  description:
    "Plataforma integral de gestión agrícola especializada en aguacate Hass. Dashboard, finanzas, mapa de lotes y asistente IA.",
  keywords: ["aguacate", "hass", "cultivo", "agricultura", "gestión agrícola", "Colombia"],
  authors: [{ name: "GermIA" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "GermIA",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#3E8F6C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Leaflet CSS — required for map rendering */}
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css" />
        {/* apple-touch-icon for all available sizes — needed for iOS home screen */}
        <link rel="apple-touch-icon" sizes="72x72" href="/icons/icon-72.png" />
        <link rel="apple-touch-icon" sizes="96x96" href="/icons/icon-96.png" />
        <link rel="apple-touch-icon" sizes="128x128" href="/icons/icon-128.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        {/* theme-color for browser chrome — paleta CampoApp */}
        <meta name="theme-color" content="#3E8F6C" />
      </head>
      <body suppressHydrationWarning>
        <AnchoPantallaSync />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#111111",
              color: "#E9F7F0",
              borderRadius: "10px",
              fontSize: "13px",
            },
            success: {
              iconTheme: { primary: "#3E8F6C", secondary: "#E9F7F0" },
            },
          }}
        />
        {/* Unregister any stale service workers */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  registrations.forEach(function(registration) {
                    registration.unregister();
                  });
                });
                caches.keys().then(function(names) {
                  names.forEach(function(name) {
                    caches.delete(name);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
