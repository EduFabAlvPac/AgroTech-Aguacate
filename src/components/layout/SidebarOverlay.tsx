"use client";

import { useSidebar } from "@/components/providers/SidebarProvider";

/**
 * Semi-transparent overlay that appears behind the sidebar on mobile.
 * Rendered in the dashboard layout; clicking it closes the sidebar.
 */
export function SidebarOverlay() {
  const { sidebarOpen, setSidebarOpen } = useSidebar();

  if (!sidebarOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 md:hidden"
      aria-hidden="true"
      onClick={() => setSidebarOpen(false)}
    />
  );
}
