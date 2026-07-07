"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useTransition, useState, type ReactNode } from "react";

const TABS = [
  { key: "alltime", label: "All-time" },
  { key: "r32",     label: "Round of 32" },
  { key: "r16",     label: "Round of 16" },
  { key: "qf",      label: "Quarter-finals" },
  { key: "sf",      label: "Semi-finals" },
  { key: "teams",   label: "Teams" },
] as const;

function LeaderboardSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-14 bg-white/5 rounded-lg" />
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="h-16 bg-white/5 rounded-lg"
          style={{ opacity: 1 - i * 0.07 }}
        />
      ))}
    </div>
  );
}

export function LeaderboardShell({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentTab = searchParams.get("tab") ?? "alltime";
  // Show clicked tab as active immediately — before the server responds
  const activeTab = isPending && pendingTab ? pendingTab : currentTab;

  const handleTabClick = (tabKey: string) => {
    if (tabKey === activeTab && !isPending) return;
    setPendingTab(tabKey);
    startTransition(() => {
      router.push(`/leaderboard?tab=${tabKey}`);
    });
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5 bg-black/40 border border-border/50 rounded-xl p-1.5 mt-8 mb-6">
        {TABS.map(t => {
          const isActive = t.key === activeTab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabClick(t.key)}
              className={`text-sm font-bold rounded-lg py-2.5 px-3 transition-all whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Swap to skeleton the instant a tab is clicked; show content once resolved */}
      {isPending ? <LeaderboardSkeleton /> : children}
    </>
  );
}
