import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AgroTech — Gestión inteligente de cultivos",
    template: "%s | AgroTech",
  },
  description:
    "Plataforma integral de gestión agrícola especializada en aguacate Hass. Dashboard, finanzas, mapa de lotes y asistente IA.",
  keywords: ["aguacate", "hass", "cultivo", "agricultura", "gestión agrícola", "Colombia"],
  authors: [{ name: "AgroTech" }],
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
      { url: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "AgroTech",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#639922",
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
        {/* apple-touch-icon for all available sizes — needed for iOS home screen */}
        <link rel="apple-touch-icon" sizes="72x72" href="/icons/icon-72.png" />
        <link rel="apple-touch-icon" sizes="96x96" href="/icons/icon-96.png" />
        <link rel="apple-touch-icon" sizes="128x128" href="/icons/icon-128.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        {/* theme-color for browser chrome — matches AgroTech green */}
        <meta name="theme-color" content="#639922" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1A2B14",
              color: "#EAF3DE",
              borderRadius: "10px",
              fontSize: "13px",
            },
            success: {
              iconTheme: { primary: "#639922", secondary: "#EAF3DE" },
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
