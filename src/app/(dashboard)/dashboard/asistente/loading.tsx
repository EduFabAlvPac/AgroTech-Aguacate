import { Skeleton } from "@/components/ui/Skeleton";

// ── Asistente loading.tsx ─────────────────────────────────────────────────────
// Shown while AsistentePage fetches the chat historial.
// Mirrors the ChatInterface layout: message list + input bar at the bottom.

export default function AsistenteLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="flex flex-col gap-1 px-6 py-4 border-b border-[var(--border-subtle)]">
        <Skeleton variant="text" className="h-5 w-40 rounded-md" />
        <Skeleton variant="text" className="h-3.5 w-72 rounded-full" />
      </div>

      {/* Chat area — fills remaining height like the real page */}
      <div
        className="flex flex-col"
        style={{ height: "calc(100vh - 64px)" }}
      >
        {/* Message history area */}
        <div className="flex-1 overflow-hidden p-4 space-y-4">
          {/* Alternating user / assistant messages */}
          {[
            { role: "assistant", lines: ["w-4/5", "w-3/5"] },
            { role: "user",      lines: ["w-48"] },
            { role: "assistant", lines: ["w-full", "w-5/6", "w-2/3"] },
            { role: "user",      lines: ["w-36"] },
            { role: "assistant", lines: ["w-4/5", "w-3/4"] },
          ].map(({ role, lines }, i) => (
            <div
              key={i}
              className={`flex gap-3 ${role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <Skeleton
                variant="avatar"
                className={`w-8 h-8 rounded-full shrink-0 ${
                  role === "assistant" ? "bg-agro-50" : "bg-[var(--border-subtle)]"
                }`}
              />
              {/* Bubble */}
              <div
                className={`max-w-[70%] space-y-1.5 ${
                  role === "user" ? "items-end flex flex-col" : ""
                }`}
              >
                <div
                  className={`rounded-[var(--radius-lg)] px-4 py-3 space-y-1.5 animate-pulse ${
                    role === "assistant"
                      ? "bg-[var(--surface-card)] border border-[var(--border-subtle)]"
                      : "bg-agro-50"
                  }`}
                >
                  {lines.map((w, li) => (
                    <div
                      key={li}
                      className={`h-3 ${w} rounded-full bg-[var(--border-subtle)]`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Suggested prompts */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="text"
              className="h-7 w-40 rounded-full shrink-0"
            />
          ))}
        </div>

        {/* Input bar */}
        <div className="px-4 pb-4 pt-2 border-t border-[var(--border-subtle)] flex gap-2">
          <Skeleton variant="text" className="flex-1 h-11 rounded-[var(--radius-md)]" />
          <Skeleton variant="text" className="h-11 w-11 rounded-[var(--radius-md)] shrink-0" />
        </div>
      </div>
    </>
  );
}
