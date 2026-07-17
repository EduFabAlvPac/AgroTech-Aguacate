"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-50 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium"
      style={{
        backgroundColor: "var(--agro-amber)",
        color: "var(--agro-amber-dark)",
        borderBottom: "2px solid var(--agro-amber-dark)",
      }}
    >
      <WifiOff size={16} aria-hidden="true" />
      <span>Sin conexión — mostrando datos guardados</span>
    </div>
  );
}
